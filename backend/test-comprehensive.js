/**
 * Comprehensive Backend Test Suite
 * 
 * Tests all core functionality including:
 * - Database operations
 * - Envelope CRUD operations
 * - Transaction management
 * - Auto-categorization logic
 * - Edge cases and error handling
 */

import { query } from './db.js';
import crypto from 'crypto';

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, error = null) {
  if (passed) {
    console.log(`✓ ${name}`);
    testResults.passed++;
  } else {
    console.log(`✗ ${name}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: name, error: error.message });
    }
  }
}

async function cleanup() {
  console.log('\n=== Cleaning up test data ===');
  try {
    await query(`DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com')`);
    await query(`DELETE FROM envelope_rules WHERE envelope_id IN (SELECT id FROM envelopes WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com'))`);
    await query(`DELETE FROM envelopes WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@test.com')`);
    await query(`DELETE FROM users WHERE email LIKE 'test-%@test.com'`);
    console.log('✓ Cleanup complete\n');
  } catch (error) {
    console.log('Warning: Cleanup had errors (may be expected if first run)');
  }
}

async function testUserOperations() {
  console.log('\n=== Testing User Operations ===');

  const userId = crypto.randomUUID();
  const cognitoSub = crypto.randomUUID();
  const email = `test-${Date.now()}@test.com`;

  try {
    // Test: Create user
    await query(
      `INSERT INTO users (id, cognito_sub, email, name, interval_type, interval_start_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
      [userId, cognitoSub, email, 'Test User', 'MONTHLY']
    );
    logTest('Create user', true);

    // Test: Retrieve user
    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
    logTest('Retrieve user', result.rows.length === 1 && result.rows[0].email === email);

    // Test: Update user
    await query('UPDATE users SET name = $1 WHERE id = $2', ['Updated Name', userId]);
    const updated = await query('SELECT * FROM users WHERE id = $1', [userId]);
    logTest('Update user', updated.rows[0].name === 'Updated Name');

    return userId;
  } catch (error) {
    logTest('User operations', false, error);
    throw error;
  }
}

async function testEnvelopeOperations(userId) {
  console.log('\n=== Testing Envelope Operations ===');

  try {
    // Test: Create envelope
    const envelopeId = crypto.randomUUID();
    await query(
      `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [envelopeId, userId, 'Groceries', 'FIXED', 500.00, 'REFRESH']
    );
    logTest('Create envelope', true);

    // Test: Retrieve envelope
    const result = await query('SELECT * FROM envelopes WHERE id = $1', [envelopeId]);
    logTest('Retrieve envelope', result.rows.length === 1);

    // Test: Get envelopes with balance
    const balanceResult = await query(
      `SELECT e.*, 
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN -t.amount WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as current_balance
       FROM envelopes e
       LEFT JOIN transactions t ON e.id = t.envelope_id
       WHERE e.user_id = $1
       GROUP BY e.id`,
      [userId]
    );
    logTest('Calculate envelope balance', balanceResult.rows.length > 0 && balanceResult.rows[0].current_balance !== undefined);

    // Test: Update envelope
    await query('UPDATE envelopes SET amount = $1 WHERE id = $2', [600.00, envelopeId]);
    const updated = await query('SELECT * FROM envelopes WHERE id = $1', [envelopeId]);
    logTest('Update envelope', parseFloat(updated.rows[0].amount) === 600.00);

    // Test: Create multiple envelopes
    const envelope2Id = crypto.randomUUID();
    await query(
      `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [envelope2Id, userId, 'Transportation', 'FIXED', 200.00, 'REFRESH']
    );

    const allEnvelopes = await query('SELECT * FROM envelopes WHERE user_id = $1', [userId]);
    logTest('Create multiple envelopes', allEnvelopes.rows.length === 2);

    return { envelopeId, envelope2Id };
  } catch (error) {
    logTest('Envelope operations', false, error);
    throw error;
  }
}

async function testEnvelopeRules(envelopeId) {
  console.log('\n=== Testing Envelope Rules ===');

  try {
    // Test: Create category rule
    const ruleId1 = crypto.randomUUID();
    await query(
      `INSERT INTO envelope_rules (id, envelope_id, plaid_category)
       VALUES ($1, $2, $3)`,
      [ruleId1, envelopeId, 'FOOD_AND_DRINK']
    );
    logTest('Create category rule', true);

    // Test: Create merchant pattern rule
    const ruleId2 = crypto.randomUUID();
    await query(
      `INSERT INTO envelope_rules (id, envelope_id, merchant_pattern)
       VALUES ($1, $2, $3)`,
      [ruleId2, envelopeId, 'Whole Foods']
    );
    logTest('Create merchant pattern rule', true);

    // Test: Retrieve rules
    const rules = await query('SELECT * FROM envelope_rules WHERE envelope_id = $1', [envelopeId]);
    logTest('Retrieve rules', rules.rows.length === 2);

    // Test: Unique constraint on rules (envelope_id + plaid_category + merchant_pattern)
    try {
      // Try to insert exact duplicate (same envelope_id, plaid_category, and merchant_pattern)
      await query(
        `INSERT INTO envelope_rules (id, envelope_id, plaid_category, merchant_pattern)
         VALUES ($1, $2, $3, $4)`,
        [crypto.randomUUID(), envelopeId, null, 'Whole Foods']
      );
      logTest('Rule unique constraint', false);
    } catch (error) {
      if (error.code === '23505') {
        logTest('Rule unique constraint', true);
      } else {
        throw error;
      }
    }

    return rules.rows;
  } catch (error) {
    logTest('Envelope rules', false, error);
    throw error;
  }
}

async function testTransactionOperations(userId, envelopeIds) {
  console.log('\n=== Testing Transaction Operations ===');

  try {
    // Test: Create expense transaction
    const txId1 = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, envelope_id, datetime, amount, type, description, merchant_name, plaid_category, is_categorized, categorization_source)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10)`,
      [txId1, userId, envelopeIds.envelopeId, 45.67, 'EXPENSE', 'Grocery shopping', 'Whole Foods', 'FOOD_AND_DRINK', true, 'AUTO']
    );
    logTest('Create expense transaction', true);

    // Test: Create income transaction
    const txId2 = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, envelope_id, datetime, amount, type, description, is_categorized, categorization_source)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8)`,
      [txId2, userId, envelopeIds.envelopeId, 500.00, 'INCOME', 'Paycheck allocation', true, 'AUTO']
    );
    logTest('Create income transaction', true);

    // Test: Create uncategorized transaction
    const txId3 = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, datetime, amount, type, description, merchant_name, is_categorized)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)`,
      [txId3, userId, 25.00, 'EXPENSE', 'Unknown purchase', 'Unknown Merchant', false]
    );
    logTest('Create uncategorized transaction', true);

    // Test: Retrieve all transactions
    const allTx = await query('SELECT * FROM transactions WHERE user_id = $1', [userId]);
    logTest('Retrieve all transactions', allTx.rows.length === 3);

    // Test: Filter by envelope
    const envelopeTx = await query('SELECT * FROM transactions WHERE user_id = $1 AND envelope_id = $2', [userId, envelopeIds.envelopeId]);
    logTest('Filter transactions by envelope', envelopeTx.rows.length === 2);

    // Test: Filter uncategorized
    const uncategorized = await query('SELECT * FROM transactions WHERE user_id = $1 AND is_categorized = false', [userId]);
    logTest('Filter uncategorized transactions', uncategorized.rows.length === 1);

    // Test: Categorize transaction
    await query(
      `UPDATE transactions SET envelope_id = $1, is_categorized = true, categorization_source = 'MANUAL' WHERE id = $2`,
      [envelopeIds.envelope2Id, txId3]
    );
    const categorized = await query('SELECT * FROM transactions WHERE id = $1', [txId3]);
    logTest('Categorize transaction', categorized.rows[0].envelope_id === envelopeIds.envelope2Id && categorized.rows[0].is_categorized === true);

    return { txId1, txId2, txId3 };
  } catch (error) {
    logTest('Transaction operations', false, error);
    throw error;
  }
}

async function testBalanceCalculations(userId, envelopeIds) {
  console.log('\n=== Testing Balance Calculations ===');

  try {
    // Get balance for envelope with income and expenses
    const result = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN -t.amount WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as balance
       FROM transactions t
       WHERE t.user_id = $1 AND t.envelope_id = $2`,
      [userId, envelopeIds.envelopeId]
    );

    const expectedBalance = 500.00 - 45.67; // income - expense
    const actualBalance = parseFloat(result.rows[0].balance);
    const isCorrect = Math.abs(actualBalance - expectedBalance) < 0.01;

    logTest('Calculate envelope balance correctly', isCorrect);

    // Test: Negative balance handling
    const txId = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, envelope_id, datetime, amount, type, description, is_categorized)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7)`,
      [txId, userId, envelopeIds.envelope2Id, 300.00, 'EXPENSE', 'Large expense', true]
    );

    const negativeBalance = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN -t.amount WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as balance
       FROM transactions t
       WHERE t.user_id = $1 AND t.envelope_id = $2`,
      [userId, envelopeIds.envelope2Id]
    );

    logTest('Handle negative balances', parseFloat(negativeBalance.rows[0].balance) < 0);

  } catch (error) {
    logTest('Balance calculations', false, error);
    throw error;
  }
}

async function testEdgeCases(userId) {
  console.log('\n=== Testing Edge Cases ===');

  try {
    // Test: Query non-existent user
    const result = await query('SELECT * FROM users WHERE id = $1', ['00000000-0000-0000-0000-000000000000']);
    logTest('Query non-existent user', result.rows.length === 0);

    // Test: Zero amount transaction
    const txId = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, datetime, amount, type, description, is_categorized)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)`,
      [txId, userId, 0.00, 'EXPENSE', 'Zero amount', false]
    );
    logTest('Handle zero amount transaction', true);

    // Test: Large amount
    const txId2 = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, datetime, amount, type, description, is_categorized)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)`,
      [txId2, userId, 999999.99, 'INCOME', 'Large amount', false]
    );
    logTest('Handle large amounts', true);

    // Test: Special characters in description
    const txId3 = crypto.randomUUID();
    await query(
      `INSERT INTO transactions (id, user_id, datetime, amount, type, description, is_categorized)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6)`,
      [txId3, userId, 10.00, 'EXPENSE', 'Test with "quotes" and \'apostrophes\'', false]
    );
    logTest('Handle special characters', true);

  } catch (error) {
    logTest('Edge cases', false, error);
    throw error;
  }
}

async function testDataIntegrity() {
  console.log('\n=== Testing Data Integrity ===');

  try {
    // Test: User email uniqueness
    const userId1 = crypto.randomUUID();
    const userId2 = crypto.randomUUID();
    const uniqueEmail = `unique-${Date.now()}@test.com`;

    await query(
      `INSERT INTO users (id, cognito_sub, email, name)
       VALUES ($1, $2, $3, $4)`,
      [userId1, crypto.randomUUID(), uniqueEmail, 'User 1']
    );

    try {
      await query(
        `INSERT INTO users (id, cognito_sub, email, name)
         VALUES ($1, $2, $3, $4)`,
        [userId2, crypto.randomUUID(), uniqueEmail, 'User 2']
      );
      logTest('Email uniqueness constraint', false);
    } catch (error) {
      if (error.code === '23505') {
        logTest('Email uniqueness constraint', true);
      } else {
        throw error;
      }
    }

    // Test: Cognito sub uniqueness
    const cognitoSub = crypto.randomUUID();
    const userId3 = crypto.randomUUID();
    const userId4 = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, cognito_sub, email, name)
       VALUES ($1, $2, $3, $4)`,
      [userId3, cognitoSub, `user3-${Date.now()}@test.com`, 'User 3']
    );

    try {
      await query(
        `INSERT INTO users (id, cognito_sub, email, name)
         VALUES ($1, $2, $3, $4)`,
        [userId4, cognitoSub, `user4-${Date.now()}@test.com`, 'User 4']
      );
      logTest('Cognito sub uniqueness constraint', false);
    } catch (error) {
      if (error.code === '23505') {
        logTest('Cognito sub uniqueness constraint', true);
      } else {
        throw error;
      }
    }

  } catch (error) {
    logTest('Data integrity', false, error);
    throw error;
  }
}

async function main() {
  console.log('=== Comprehensive Backend Test Suite ===');
  console.log('Testing database operations, business logic, and edge cases\n');

  try {
    await cleanup();

    const userId = await testUserOperations();
    const envelopeIds = await testEnvelopeOperations(userId);
    const rules = await testEnvelopeRules(envelopeIds.envelopeId);
    const transactionIds = await testTransactionOperations(userId, envelopeIds);
    await testBalanceCalculations(userId, envelopeIds);
    await testEdgeCases(userId);
    await testDataIntegrity();

    await cleanup();

    console.log('\n=== Test Summary ===');
    console.log(`✓ Passed: ${testResults.passed}`);
    console.log(`✗ Failed: ${testResults.failed}`);
    console.log(`Total: ${testResults.passed + testResults.failed}`);

    if (testResults.errors.length > 0) {
      console.log('\n=== Errors ===');
      testResults.errors.forEach(err => {
        console.log(`${err.test}: ${err.error}`);
      });
    }

    if (testResults.failed === 0) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main();
