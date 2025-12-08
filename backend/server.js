import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register, login, authenticateToken, getUserSettings, updateUserSettings } from './auth.js';
import { getEnvelopes, createEnvelope, updateEnvelope, deleteEnvelope, getEnvelopeRules, addEnvelopeRule } from './envelopes.js';
import { getTransactions, categorizeTransaction, reallocateTransaction, createTransaction } from './transactions.js';
import { createLinkToken, exchangePublicToken, syncTransactions, createSandboxPublicToken } from './plaid.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/register', register);
app.post('/login', login);
app.get('/user/settings', authenticateToken, getUserSettings);
app.put('/user/settings', authenticateToken, updateUserSettings);

app.get('/envelopes', authenticateToken, getEnvelopes);
app.post('/envelopes', authenticateToken, createEnvelope);
app.put('/envelopes/:id', authenticateToken, updateEnvelope);
app.delete('/envelopes/:id', authenticateToken, deleteEnvelope);
app.get('/envelopes/:id/rules', authenticateToken, getEnvelopeRules);
app.post('/envelopes/:id/rules', authenticateToken, addEnvelopeRule);

app.get('/transactions', authenticateToken, getTransactions);
app.post('/transactions', authenticateToken, createTransaction);
app.put('/transactions/:id/categorize', authenticateToken, categorizeTransaction);
app.post('/transactions/:id/reallocate', authenticateToken, reallocateTransaction);

app.post('/plaid/link-token', authenticateToken, createLinkToken);
app.post('/plaid/sandbox-link', authenticateToken, createSandboxPublicToken);
app.post('/plaid/exchange-token', authenticateToken, exchangePublicToken);
app.post('/plaid/sync', authenticateToken, syncTransactions);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
