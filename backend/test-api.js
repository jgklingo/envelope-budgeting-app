import crypto from 'crypto';
import { query } from './db.js';

async function createTestUser() {
  const userId = crypto.randomUUID();
  const cognitoSub = crypto.randomUUID();

  await query(
    `INSERT INTO users (id, cognito_sub, email, name, interval_type, interval_start_date)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
     ON CONFLICT (email) DO NOTHING`,
    [userId, cognitoSub, 'testapi@example.com', 'API Test User', 'MONTHLY']
  );

  console.log('Test user created:', userId);
  return userId;
}

async function createTestEnvelope(userId) {
  const envelopeId = crypto.randomUUID();

  await query(
    `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [envelopeId, userId, 'Groceries', 'FIXED', 500.00, 'REFRESH']
  );

  console.log('Test envelope created:', envelopeId);
  return envelopeId;
}

async function createTestTransaction(userId, envelopeId) {
  const transactionId = crypto.randomUUID();

  await query(
    `INSERT INTO transactions (id, user_id, envelope_id, datetime, amount, type, description, merchant_name, is_categorized, categorization_source)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)`,
    [transactionId, userId, envelopeId, 45.67, 'EXPENSE', 'Grocery shopping', 'Whole Foods', true, 'MANUAL']
  );

  console.log('Test transaction created:', transactionId);
  return transactionId;
}

async function main() {
  try {
    const userId = await createTestUser();
    const envelopeId = await createTestEnvelope(userId);
    const transactionId = await createTestTransaction(userId, envelopeId);

    console.log('\nTest data created successfully!');
    console.log('User ID:', userId);
    console.log('Envelope ID:', envelopeId);
    console.log('Transaction ID:', transactionId);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
