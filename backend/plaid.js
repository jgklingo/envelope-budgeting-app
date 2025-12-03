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

    await query(
      `UPDATE users 
       SET plaid_access_token = $1, plaid_item_id = $2, updated_at = CURRENT_TIMESTAMP
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
    const userId = req.user.userId;

    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    if (!user.plaid_access_token) {
      return res.status(400).json({ error: 'No Plaid account linked' });
    }

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

      await query(
        `INSERT INTO transactions (id, user_id, envelope_id, plaid_transaction_id, datetime, amount, type, description, merchant_name, plaid_category, is_categorized, categorization_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (plaid_transaction_id) DO NOTHING`,
        [transactionId, userId, envelopeId, tx.transaction_id, tx.date, amount, type, tx.name, tx.merchant_name, category, envelopeId ? true : false, categorizationSource]
      );
    }

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

    for (const removedTx of removed) {
      await query('DELETE FROM transactions WHERE plaid_transaction_id = $1', [removedTx.transaction_id]);
    }

    res.json({
      message: 'Transactions synced successfully',
      added: added.length,
      modified: modified.length,
      removed: removed.length,
    });
  } catch (error) {
    console.error('Sync transactions error:', error);
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
}
