import { AuroraDSQLClient } from '@aws/aurora-dsql-node-postgres-connector';
import dotenv from 'dotenv';

dotenv.config();

export async function query(text, params) {
  const client = new AuroraDSQLClient({
    host: process.env.DSQL_ENDPOINT,
    user: 'admin',
  });

  try {
    await client.connect();
    const result = await client.query(text, params);
    return result;
  } finally {
    await client.end();
  }
}
