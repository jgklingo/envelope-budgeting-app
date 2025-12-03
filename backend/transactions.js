import crypto from 'crypto';
import { query } from './db.js';

export async function getTransactions(req, res) {
  try {
    const userId = req.user.userId;
    const { envelope_id, uncategorized, start_date, end_date } = req.query;

    let sql = `
      SELECT t.*, e.name as envelope_name
      FROM transactions t
      LEFT JOIN envelopes e ON t.envelope_id = e.id
      WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    if (envelope_id) {
      paramCount++;
      sql += ` AND t.envelope_id = $${paramCount}`;
      params.push(envelope_id);
    }

    if (uncategorized === 'true') {
      sql += ` AND t.is_categorized = false`;
    }

    if (start_date) {
      paramCount++;
      sql += ` AND t.datetime >= $${paramCount}`;
      params.push(start_date);
    }

    if (end_date) {
      paramCount++;
      sql += ` AND t.datetime <= $${paramCount}`;
      params.push(end_date);
    }

    sql += ` ORDER BY t.datetime DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
}

export async function categorizeTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { envelope_id, apply_rule } = req.body;

    const transaction = await query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const envelope = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [envelope_id, userId]);
    if (envelope.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    await query(
      `UPDATE transactions 
       SET envelope_id = $1, is_categorized = true, categorization_source = 'MANUAL'
       WHERE id = $2`,
      [envelope_id, id]
    );

    if (apply_rule === true) {
      const tx = transaction.rows[0];
      const ruleId = crypto.randomUUID();

      if (tx.merchant_name) {
        await query(
          `INSERT INTO envelope_rules (id, envelope_id, plaid_category, merchant_pattern)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (envelope_id, plaid_category, merchant_pattern) DO NOTHING`,
          [ruleId, envelope_id, tx.plaid_category, tx.merchant_name]
        );
      }
    }

    const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Categorize transaction error:', error);
    res.status(500).json({ error: 'Failed to categorize transaction' });
  }
}

export async function reallocateTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { envelope_id } = req.body;

    const transaction = await query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);
    if (transaction.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.rows[0].type !== 'INCOME') {
      return res.status(400).json({ error: 'Only income transactions can be reallocated' });
    }

    const envelope = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [envelope_id, userId]);
    if (envelope.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    await query(
      `UPDATE transactions 
       SET envelope_id = $1
       WHERE id = $2`,
      [envelope_id, id]
    );

    const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Reallocate transaction error:', error);
    res.status(500).json({ error: 'Failed to reallocate transaction' });
  }
}

export async function createTransaction(req, res) {
  try {
    const userId = req.user.userId;
    const { amount, type, datetime, description, merchant_name, envelope_id } = req.body;

    if (!amount || !type || !datetime) {
      return res.status(400).json({ error: 'Amount, type, and datetime are required' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ error: 'Type must be INCOME or EXPENSE' });
    }

    const transactionId = crypto.randomUUID();

    await query(
      `INSERT INTO transactions (id, user_id, envelope_id, datetime, amount, type, description, merchant_name, is_categorized, categorization_source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [transactionId, userId, envelope_id || null, datetime, amount, type, description || null, merchant_name || null, envelope_id ? true : false, envelope_id ? 'MANUAL' : null]
    );

    const result = await query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
}
