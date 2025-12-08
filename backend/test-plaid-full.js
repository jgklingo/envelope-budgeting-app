/**
 * Complete Plaid Sandbox Integration Test
 * 
 * This script demonstrates:
 * 1. Creating a sandbox public token (simulates user linking bank via UI)
 * 2. Exchanging it for an access token
 * 3. Syncing fake transaction data from Plaid sandbox
 * 
 * NO PAYMENT REQUIRED - completely free sandbox environment!
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { query } from './db.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

async function createTestUser() {
  const userId = crypto.randomUUID();
  const cognitoSub = crypto.randomUUID();

  // First delete any existing test user
  await query(`DELETE FROM users WHERE email = $1`, ['plaidtest@example.com']);

  // Create new test user
  await query(
    `INSERT INTO users (id, cognito_sub, email, name, interval_type, interval_start_date)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
    [userId, cognitoSub, 'plaidtest@example.com', 'Plaid Test User', 'MONTHLY']
  );

  console.log('✓ Test user created:', userId);
  return userId;
}

async function createTestEnvelopes(userId) {
  const groceriesId = crypto.randomUUID();
  const transportId = crypto.randomUUID();

  await query(
    `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [groceriesId, userId, 'Groceries', 'FIXED', 500.00, 'REFRESH']
  );

  await query(
    `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [transportId, userId, 'Transportation', 'FIXED', 200.00, 'REFRESH']
  );

  // Add rules for auto-categorization
  await query(
    `INSERT INTO envelope_rules (id, envelope_id, plaid_category)
     VALUES ($1, $2, $3)`,
    [crypto.randomUUID(), groceriesId, 'FOOD_AND_DRINK']
  );

  // Add merchant pattern rule for Uber (since Plaid categorizes it as OTHER)
  await query(
    `INSERT INTO envelope_rules (id, envelope_id, merchant_pattern)
     VALUES ($1, $2, $3)`,
    [crypto.randomUUID(), transportId, 'Uber']
  );

  await query(
    `INSERT INTO envelope_rules (id, envelope_id, plaid_category)
     VALUES ($1, $2, $3)`,
    [crypto.randomUUID(), transportId, 'TRANSPORTATION']
  );

  console.log('✓ Test envelopes created with auto-categorization rules');
  console.log('  - Groceries: matches FOOD_AND_DRINK category');
  console.log('  - Transportation: matches Uber merchant + TRANSPORTATION category');
  return { groceriesId, transportId };
}

async function simulatePlaidLink(userId) {
  console.log('\n=== Step 1: Simulate Plaid Link (User connects bank) ===');

  // Create sandbox public token
  // This simulates what happens when user completes Plaid Link UI
  // Institution: First Platypus Bank (fake sandbox bank)
  const response = await plaidClient.sandboxPublicTokenCreate({
    institution_id: 'ins_109508', // First Platypus Bank
    initial_products: ['transactions'],
  });

  const publicToken = response.data.public_token;
  console.log('✓ Sandbox public token created:', publicToken.substring(0, 50) + '...');

  return publicToken;
}

async function exchangeToken(publicToken, userId) {
  console.log('\n=== Step 2: Exchange Public Token for Access Token ===');

  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken
  });

  const accessToken = response.data.access_token;
  const itemId = response.data.item_id;

  // Save to database
  await query(
    `UPDATE users 
     SET plaid_access_token = $1, plaid_item_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [accessToken, itemId, userId]
  );

  console.log('✓ Access token saved to database');
  console.log('  Item ID:', itemId);

  return accessToken;
}

async function syncTransactions(userId, accessToken) {
  console.log('\n=== Step 3: Sync Transactions from Plaid ===');

  // Get user's current cursor
  const userResult = await query('SELECT plaid_cursor FROM users WHERE id = $1', [userId]);
  let cursor = userResult.rows[0].plaid_cursor;

  let hasMore = true;
  let allAdded = [];
  let allModified = [];
  let allRemoved = [];

  while (hasMore) {
    const request = {
      access_token: accessToken,
      cursor: cursor,
    };

    const response = await plaidClient.transactionsSync(request);
    const data = response.data;

    allAdded = allAdded.concat(data.added);
    allModified = allModified.concat(data.modified);
    allRemoved = allRemoved.concat(data.removed);

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  // Update cursor
  await query('UPDATE users SET plaid_cursor = $1 WHERE id = $2', [cursor, userId]);

  console.log(`✓ Received ${allAdded.length} new transactions from Plaid`);

  // Get rules for auto-categorization
  const rulesResult = await query(
    `SELECT er.*, e.id as envelope_id
     FROM envelope_rules er
     JOIN envelopes e ON er.envelope_id = e.id
     WHERE e.user_id = $1`,
    [userId]
  );
  const rules = rulesResult.rows;

  console.log(`  Found ${rules.length} auto-categorization rules`);

  // Import transactions
  let categorized = 0;
  let uncategorized = 0;

  for (const tx of allAdded) {
    if (tx.pending) continue;

    const transactionId = crypto.randomUUID();
    const amount = Math.abs(tx.amount);
    const type = tx.amount > 0 ? 'EXPENSE' : 'INCOME';
    const category = tx.personal_finance_category?.primary || tx.category?.[0] || null;

    // Debug: show categories and merchant names for first few transactions
    if (allAdded.indexOf(tx) < 5) {
      console.log(`  Debug: "${tx.name}" -> category: "${category}", merchant: "${tx.merchant_name || 'null'}"`);
    }

    let envelopeId = null;
    let categorizationSource = null;

    // Try to auto-categorize
    for (const rule of rules) {
      if (rule.plaid_category && category) {
        // Normalize categories for comparison
        const normalizedCategory = category.toLowerCase().replace(/_/g, ' ');
        const normalizedRule = rule.plaid_category.toLowerCase().replace(/_/g, ' ');

        if (normalizedCategory.includes(normalizedRule) || normalizedRule.includes(normalizedCategory)) {
          envelopeId = rule.envelope_id;
          categorizationSource = 'AUTO';
          categorized++;
          break;
        }
      }
      if (rule.merchant_pattern) {
        // Check both merchant_name and name fields (sandbox uses name field)
        const merchantText = tx.merchant_name || tx.name || '';
        if (merchantText.toLowerCase().includes(rule.merchant_pattern.toLowerCase())) {
          envelopeId = rule.envelope_id;
          categorizationSource = 'AUTO';
          categorized++;
          break;
        }
      }
    }

    if (!envelopeId) {
      uncategorized++;
    }

    await query(
      `INSERT INTO transactions (id, user_id, envelope_id, plaid_transaction_id, datetime, amount, type, description, merchant_name, plaid_category, is_categorized, categorization_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (plaid_transaction_id) DO NOTHING`,
      [transactionId, userId, envelopeId, tx.transaction_id, tx.date, amount, type, tx.name, tx.merchant_name, category, envelopeId ? true : false, categorizationSource]
    );
  }

  console.log(`✓ Imported transactions:`);
  console.log(`  - Auto-categorized: ${categorized}`);
  console.log(`  - Need manual categorization: ${uncategorized}`);

  return { added: allAdded.length, categorized, uncategorized };
}

async function displayResults(userId) {
  console.log('\n=== Step 4: View Results ===');

  // Get all transactions
  const txResult = await query(
    `SELECT t.*, e.name as envelope_name
     FROM transactions t
     LEFT JOIN envelopes e ON t.envelope_id = e.id
     WHERE t.user_id = $1
     ORDER BY t.datetime DESC
     LIMIT 10`,
    [userId]
  );

  console.log(`\nFirst 10 transactions:`);
  txResult.rows.forEach((tx, i) => {
    const status = tx.is_categorized ? `→ ${tx.envelope_name}` : '(uncategorized)';
    console.log(`  ${i + 1}. $${tx.amount} - ${tx.merchant_name || tx.description} ${status}`);
  });

  // Get envelope balances
  const envelopeResult = await query(
    `SELECT 
       e.name,
       e.amount as budget,
       COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount ELSE -t.amount END), 0) as balance
     FROM envelopes e
     LEFT JOIN transactions t ON e.id = t.envelope_id
     WHERE e.user_id = $1
     GROUP BY e.id, e.name, e.amount`,
    [userId]
  );

  console.log(`\nEnvelope Balances:`);
  envelopeResult.rows.forEach(env => {
    console.log(`  ${env.name}: $${env.balance} / $${env.budget}`);
  });
}

async function main() {
  try {
    console.log('=== Plaid Sandbox Integration Test ===');
    console.log('Using FREE sandbox environment - no payment required!\n');

    const userId = await createTestUser();
    await createTestEnvelopes(userId);

    const publicToken = await simulatePlaidLink(userId);
    const accessToken = await exchangeToken(publicToken, userId);

    const results = await syncTransactions(userId, accessToken);
    await displayResults(userId);

    console.log('\n=== Test Complete ===');
    console.log('\nWhat just happened:');
    console.log('1. Created test user with two envelopes (Groceries, Transportation)');
    console.log('2. Simulated user linking their bank via Plaid Link UI');
    console.log('3. Synced fake transactions from Plaid sandbox');
    console.log('4. Auto-categorized transactions based on rules');
    console.log('5. Calculated envelope balances\n');

    console.log('In production:');
    console.log('- User would use Plaid Link UI in your frontend');
    console.log('- Real transaction data would sync from their actual bank');
    console.log('- Same auto-categorization rules would apply\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

main();
