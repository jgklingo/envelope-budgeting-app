import crypto from 'crypto';
import { query } from './db.js';

export async function getEnvelopes(req, res) {
  try {
    const userId = req.user.userId;

    const result = await query(
      `SELECT e.*, 
        COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' THEN -t.amount WHEN t.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as current_balance
       FROM envelopes e
       LEFT JOIN transactions t ON e.id = t.envelope_id
       WHERE e.user_id = $1
       GROUP BY e.id
       ORDER BY e.created_at`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get envelopes error:', error);
    res.status(500).json({ error: 'Failed to retrieve envelopes' });
  }
}

export async function createEnvelope(req, res) {
  try {
    const userId = req.user.userId;
    const { name, amount_type, amount, refresh_type, rules } = req.body;

    if (!name || !amount_type || amount === undefined || !refresh_type) {
      return res.status(400).json({ error: 'Name, amount_type, amount, and refresh_type are required' });
    }

    if (!['FIXED', 'PERCENTAGE_CURRENT', 'PERCENTAGE_PREVIOUS'].includes(amount_type)) {
      return res.status(400).json({ error: 'Invalid amount_type' });
    }

    if (!['REFRESH', 'ROLLOVER'].includes(refresh_type)) {
      return res.status(400).json({ error: 'Invalid refresh_type' });
    }

    const envelopeId = crypto.randomUUID();

    await query(
      `INSERT INTO envelopes (id, user_id, name, amount_type, amount, refresh_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [envelopeId, userId, name, amount_type, amount, refresh_type]
    );

    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        const ruleId = crypto.randomUUID();
        await query(
          `INSERT INTO envelope_rules (id, envelope_id, plaid_category, merchant_pattern)
           VALUES ($1, $2, $3, $4)`,
          [ruleId, envelopeId, rule.plaid_category || null, rule.merchant_pattern || null]
        );
      }
    }

    const result = await query('SELECT * FROM envelopes WHERE id = $1', [envelopeId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create envelope error:', error);
    res.status(500).json({ error: 'Failed to create envelope' });
  }
}

export async function updateEnvelope(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, amount_type, amount, refresh_type } = req.body;

    const existing = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    await query(
      `UPDATE envelopes 
       SET name = COALESCE($1, name),
           amount_type = COALESCE($2, amount_type),
           amount = COALESCE($3, amount),
           refresh_type = COALESCE($4, refresh_type),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, amount_type, amount, refresh_type, id]
    );

    const result = await query('SELECT * FROM envelopes WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update envelope error:', error);
    res.status(500).json({ error: 'Failed to update envelope' });
  }
}

export async function deleteEnvelope(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const existing = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    await query('UPDATE transactions SET envelope_id = NULL WHERE envelope_id = $1', [id]);
    await query('DELETE FROM envelope_rules WHERE envelope_id = $1', [id]);
    await query('DELETE FROM envelopes WHERE id = $1', [id]);

    res.json({ message: 'Envelope deleted successfully' });
  } catch (error) {
    console.error('Delete envelope error:', error);
    res.status(500).json({ error: 'Failed to delete envelope' });
  }
}

export async function getEnvelopeRules(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const envelope = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (envelope.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const result = await query('SELECT * FROM envelope_rules WHERE envelope_id = $1', [id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to retrieve rules' });
  }
}

export async function addEnvelopeRule(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { plaid_category, merchant_pattern } = req.body;

    const envelope = await query('SELECT * FROM envelopes WHERE id = $1 AND user_id = $2', [id, userId]);
    if (envelope.rows.length === 0) {
      return res.status(404).json({ error: 'Envelope not found' });
    }

    const ruleId = crypto.randomUUID();
    await query(
      `INSERT INTO envelope_rules (id, envelope_id, plaid_category, merchant_pattern)
       VALUES ($1, $2, $3, $4)`,
      [ruleId, id, plaid_category || null, merchant_pattern || null]
    );

    const result = await query('SELECT * FROM envelope_rules WHERE id = $1', [ruleId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add rule error:', error);
    res.status(500).json({ error: 'Failed to add rule' });
  }
}
