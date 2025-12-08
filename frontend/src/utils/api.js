const API_BASE = '/api'

// Helper function to handle responses and check for auth errors
const handleResponse = async (res) => {
  if (res.status === 401 || res.status === 403) {
    // Token is invalid or expired
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Authentication expired. Please log in again.')
  }
  return res.json()
}

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
    return handleResponse(res)
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
    return handleResponse(res)
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
    return handleResponse(res)
  },

  deleteEnvelope: async (token, id) => {
    const res = await fetch(`${API_BASE}/envelopes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(res)
  },

  // Transactions
  getTransactions: async (token, filters = {}) => {
    const params = new URLSearchParams(filters)
    const res = await fetch(`${API_BASE}/transactions?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(res)
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
    return handleResponse(res)
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
    return handleResponse(res)
  },

  // Plaid
  getLinkToken: async (token) => {
    const res = await fetch(`${API_BASE}/plaid/link-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(res)
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
    return handleResponse(res)
  },

  syncTransactions: async (token) => {
    const res = await fetch(`${API_BASE}/plaid/sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(res)
  },

  // User Settings
  getUserSettings: async (token) => {
    const res = await fetch(`${API_BASE}/user/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(res)
  },

  updateUserSettings: async (token, settings) => {
    const res = await fetch(`${API_BASE}/user/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    })
    return handleResponse(res)
  }
}
