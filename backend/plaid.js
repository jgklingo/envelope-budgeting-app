import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import crypto from 'crypto';
import { query } from './db.js';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Sandbox helper: Create a public token for testing
export async function createSandboxPublicToken(req, res) {
  try {
    // Only allow in sandbox environment
    if (process.env.PLAID_ENV !== 'sandbox') {
      return res.status(403).json({ error: 'This endpoint is only available in sandbox mode' });
    }

    const response = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_109508', // First Platypus Bank
      initial_products: ['transactions'],
    });

    res.json({ public_token: response.data.public_token });
  } catch (error) {
    console.error('Create sandbox token error:', error);
    res.status(500).json({ error: 'Failed to create sandbox token' });
  }
}

export async function createLinkToken(req, res) {
  try {
    const userId = req.user.userId;

    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Envelope Budgeting App',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Create link token error:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
}

export async function exchangePublicToken(req, res) {
  try {
    const userId = req.user.userId;
    const { public_token } = req.body;

    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Reset cursor when linking new account (cursor is tied to specific access_token)
    await query(
      `UPDATE users 
       SET plaid_access_token = $1, plaid_item_id = $2, plaid_cursor = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [accessToken, itemId, userId]
    );

    res.json({ message: 'Bank account linked successfully' });
  } catch (error) {
    console.error('Exchange token error:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
}

export async function syncTransactions(req, res) {
  try {
    console.log('Starting transaction sync...');
    const userId = req.user.userId;

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    console.log('User found, checking Plaid token...');

    if (!user.plaid_access_token) {
      return res.status(400).json({ error: 'No Plaid account linked' });
    }

    console.log('Plaid token exists, starting sync...');
    let cursor = user.plaid_cursor;
    let hasMore = true;
    let added = [];
    let modified = [];
    let removed = [];

    while (hasMore) {
      const request = {
        access_token: user.plaid_access_token,
        cursor: cursor,
      };

      const response = await plaidClient.transactionsSync(request);
      const data = response.data;

      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    await query('UPDATE users SET plaid_cursor = $1 WHERE id = $2', [cursor, userId]);

    const rulesResult = await query(
      `SELECT er.*, e.id as envelope_id
       FROM envelope_rules er
       JOIN envelopes e ON er.envelope_id = e.id
       WHERE e.user_id = $1`,
      [userId]
    );
    const rules = rulesResult.rows;

    // Batch insert transactions for better performance
    const valueSets = [];
    const values = [];
    let paramIndex = 1;

    for (const tx of added) {
      if (tx.pending) continue;

      const transactionId = crypto.randomUUID();
      const amount = Math.abs(tx.amount);
      const type = tx.amount > 0 ? 'EXPENSE' : 'INCOME';
      const category = tx.personal_finance_category?.primary || tx.category?.[0] || null;

      let envelopeId = null;
      let categorizationSource = null;

      for (const rule of rules) {
        if (rule.plaid_category && category && category.toLowerCase().includes(rule.plaid_category.toLowerCase())) {
          envelopeId = rule.envelope_id;
          categorizationSource = 'AUTO';
          break;
        }
        if (rule.merchant_pattern && tx.merchant_name && tx.merchant_name.toLowerCase().includes(rule.merchant_pattern.toLowerCase())) {
          envelopeId = rule.envelope_id;
          categorizationSource = 'AUTO';
          break;
        }
      }

      valueSets.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11})`);
      values.push(transactionId, userId, envelopeId, tx.transaction_id, tx.date, amount, type, tx.name, tx.merchant_name, category, envelopeId ? true : false, categorizationSource);
      paramIndex += 12;
    }

    if (valueSets.length > 0) {
      await query(
        `INSERT INTO transactions (id, user_id, envelope_id, plaid_transaction_id, datetime, amount, type, description, merchant_name, plaid_category, is_categorized, categorization_source)
         VALUES ${valueSets.join(', ')}
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        values
      );
    }

    if (modified.length > 0) {
      for (const tx of modified) {
        const amount = Math.abs(tx.amount);
        const type = tx.amount > 0 ? 'EXPENSE' : 'INCOME';
        const category = tx.personal_finance_category?.primary || tx.category?.[0] || null;

        await query(
          `UPDATE transactions
           SET datetime = $1, amount = $2, type = $3, description = $4, merchant_name = $5, plaid_category = $6
           WHERE plaid_transaction_id = $7`,
          [tx.date, amount, type, tx.name, tx.merchant_name, category, tx.transaction_id]
        );
      }
    }

    if (removed.length > 0) {
      const removedIds = removed.map(tx => tx.transaction_id);
      await query(
        `DELETE FROM transactions WHERE plaid_transaction_id = ANY($1)`,
        [removedIds]
      );
    }

    res.json({
      message: 'Transactions synced successfully',
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    });
  } catch (error) {
    console.error('Sync transactions error:', error);
    console.error('Full error details:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to sync transactions', details: error.message });
  }
}
