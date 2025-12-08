import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function Envelopes({ token }) {
  const [envelopes, setEnvelopes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [selectedEnvelope, setSelectedEnvelope] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRecategorize, setShowRecategorize] = useState(null)
  const [showReallocate, setShowReallocate] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [envData, txData] = await Promise.all([
        api.getEnvelopes(token),
        api.getTransactions(token, { limit: 500 })
      ])

      if (Array.isArray(envData)) setEnvelopes(envData)
      if (Array.isArray(txData)) setTransactions(txData)

      if (Array.isArray(envData) && envData.length > 0 && !selectedEnvelope) {
        setSelectedEnvelope(envData[0].id)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRecategorize = async (txId, envelopeId, applyRule) => {
    try {
      await api.categorizeTransaction(token, txId, envelopeId, applyRule)
      await loadData()
      setShowRecategorize(null)
    } catch (err) {
      console.error('Failed to recategorize:', err)
    }
  }

  const handleReallocate = async (txId, envelopeId) => {
    try {
      await api.reallocateTransaction(token, txId, envelopeId)
      await loadData()
      setShowReallocate(null)
    } catch (err) {
      console.error('Failed to reallocate:', err)
    }
  }

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>

  const selectedEnv = envelopes.find(e => e.id === selectedEnvelope)
  const envelopeTransactions = transactions.filter(t => t.envelope_id === selectedEnvelope)

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Envelope Details</h1>

      {/* Envelope Selector */}
      <div className="card">
        <div className="form-group">
          <label>Select Envelope</label>
          <select value={selectedEnvelope || ''} onChange={(e) => setSelectedEnvelope(e.target.value)}>
            {envelopes.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
        {selectedEnv && (
          <div style={{ marginTop: '15px' }}>
            <p><strong>Budget:</strong> ${parseFloat(selectedEnv.amount).toFixed(2)}</p>
            <p><strong>Amount Remaining:</strong> <span style={{ color: parseFloat(selectedEnv.amount_remaining) < 0 ? '#f44336' : '#4CAF50' }}>
              ${parseFloat(selectedEnv.amount_remaining || 0).toFixed(2)}
            </span></p>
            <p><strong>Current Balance:</strong> ${parseFloat(selectedEnv.current_balance || 0).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <h2 style={{ marginTop: '30px', marginBottom: '15px' }}>Transactions</h2>
      {envelopeTransactions.length === 0 ? (
        <div className="card">
          <p>No transactions in this envelope yet.</p>
        </div>
      ) : (
        envelopeTransactions.map(tx => (
          <div key={tx.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <h3>{tx.merchant_name || tx.description || 'Transaction'}</h3>
                <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  {new Date(tx.datetime).toLocaleDateString()} • Category: {tx.plaid_category || 'None'}
                </p>
                {tx.plaid_category && (
                  <p style={{ fontSize: '12px', color: '#999' }}>Plaid Category: {tx.plaid_category}</p>
                )}
              </div>
              <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: tx.amount < 0 ? '#f44336' : '#4CAF50' }}>
                  ${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                </p>
                {tx.amount < 0 ? (
                  <button onClick={() => setShowRecategorize(tx.id)} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                    Recategorize
                  </button>
                ) : (
                  <button onClick={() => setShowReallocate(tx.id)} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                    Reallocate
                  </button>
                )}
              </div>
            </div>

            {/* Recategorize Modal */}
            {showRecategorize === tx.id && (
              <div style={{ marginTop: '15px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
                <h4>Recategorize Transaction</h4>
                <div className="form-group">
                  <label>New Envelope</label>
                  <select id={`recategorize-${tx.id}`}>
                    {envelopes.map(env => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      const newEnvId = document.getElementById(`recategorize-${tx.id}`).value
                      handleRecategorize(tx.id, newEnvId, false)
                    }}
                    className="btn btn-secondary"
                  >
                    One Time
                  </button>
                  <button
                    onClick={() => {
                      const newEnvId = document.getElementById(`recategorize-${tx.id}`).value
                      handleRecategorize(tx.id, newEnvId, true)
                    }}
                    className="btn btn-primary"
                  >
                    Apply Rule
                  </button>
                  <button onClick={() => setShowRecategorize(null)} className="btn btn-danger">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Reallocate Modal */}
            {showReallocate === tx.id && (
              <div style={{ marginTop: '15px', padding: '15px', background: '#f5f5f5', borderRadius: '5px' }}>
                <h4>Reallocate Income</h4>
                <div className="form-group">
                  <label>New Envelope</label>
                  <select id={`reallocate-${tx.id}`}>
                    {envelopes.map(env => (
                      <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    onClick={() => {
                      const newEnvId = document.getElementById(`reallocate-${tx.id}`).value
                      handleReallocate(tx.id, newEnvId)
                    }}
                    className="btn btn-primary"
                  >
                    Reallocate
                  </button>
                  <button onClick={() => setShowReallocate(null)} className="btn btn-danger">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default Envelopes
