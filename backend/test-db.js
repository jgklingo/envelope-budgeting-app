import { AuroraDSQLClient } from '@aws/aurora-dsql-node-postgres-connector';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

// Create Aurora DSQL client - handles IAM auth automatically
function createClient() {
  return new AuroraDSQLClient({
    host: process.env.DSQL_ENDPOINT,
    user: 'admin', // Use admin for initial testing
    // All other parameters like port, database are optional
    // Connector automatically handles IAM token generation and refresh
  });
}

async function testConnection() {
  let client;
  try {
    console.log('Creating Aurora DSQL client...');
    client = createClient();

    console.log('Connecting to Aurora DSQL...');
    await client.connect();
    console.log('✓ Connected successfully!\n');

    // Test 1: List all tables
    console.log('Test 1: Listing all tables...');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    console.log('Tables found:');
    tablesResult.rows.forEach(row => console.log(`  - ${row.tablename}`));
    console.log('');

    // Test 2: Create a test user
    console.log('Test 2: Creating test user...');
    const userId = crypto.randomUUID();
    const cognitoSub = `test-${Date.now()}`;
    const testEmail = `test-${Date.now()}@example.com`;

    await client.query(`
      INSERT INTO users (id, cognito_sub, email, name)
      VALUES ($1, $2, $3, $4)
    `, [userId, cognitoSub, testEmail, 'Test User']);
    console.log(`✓ Created user with ID: ${userId}\n`);

    // Test 3: Create a test envelope
    console.log('Test 3: Creating test envelope...');
    const envelopeId = crypto.randomUUID();

    await client.query(`
      INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [envelopeId, userId, 'Groceries', 'FIXED', 500.00, 'REFRESH']);
    console.log(`✓ Created envelope with ID: ${envelopeId}\n`);

    // Test 4: Query the data back
    console.log('Test 4: Querying test data...');
    const result = await client.query(`
      SELECT u.name as user_name, e.name as envelope_name, e.amount
      FROM users u
      JOIN envelopes e ON u.id = e.user_id
      WHERE u.id = $1
    `, [userId]);

    console.log('Query result:');
    console.log(result.rows[0]);
    console.log('');

    // Test 5: Clean up test data
    console.log('Test 5: Cleaning up test data...');
    await client.query('DELETE FROM envelopes WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('✓ Cleanup complete\n');

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('\nConnection closed.');
  }
}

testConnection();
