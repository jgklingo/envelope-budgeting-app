const API_BASE = '/api'

export const api = {
  // Auth
  register: async (email, password) => {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return res.json()
  },

  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return res.json()
  },

  // Envelopes
  getEnvelopes: async (token) => {
    const res = await fetch(`${API_BASE}/envelopes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return res.json()
  },

  createEnvelope: async (token, envelope) => {
    const res = await fetch(`${API_BASE}/envelopes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(envelope)
    })
    return res.json()
  },

  updateEnvelope: async (token, id, envelope) => {
    const res = await fetch(`${API_BASE}/envelopes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(envelope)
    })
    return res.json()
  },

  deleteEnvelope: async (token, id) => {
    const res = await fetch(`${API_BASE}/envelopes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return res.json()
  },

  // Transactions
  getTransactions: async (token, filters = {}) => {
    const params = new URLSearchParams(filters)
    const res = await fetch(`${API_BASE}/transactions?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return res.json()
  },

  categorizeTransaction: async (token, id, envelopeId, applyRule) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/categorize`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ envelope_id: envelopeId, apply_rule: applyRule })
    })
    return res.json()
  },

  reallocateTransaction: async (token, id, envelopeId) => {
    const res = await fetch(`${API_BASE}/transactions/${id}/reallocate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ envelope_id: envelopeId })
    })
    return res.json()
  },

  // Plaid
  getLinkToken: async (token) => {
    const res = await fetch(`${API_BASE}/plaid/link-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return res.json()
  },

  exchangePublicToken: async (token, publicToken) => {
    const res = await fetch(`${API_BASE}/plaid/exchange-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ public_token: publicToken })
    })
    return res.json()
  },

  syncTransactions: async (token) => {
    const res = await fetch(`${API_BASE}/plaid/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return res.json()
  }
}
