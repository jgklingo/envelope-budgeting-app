import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function Categorization({ token }) {
  const [uncategorized, setUncategorized] = useState([])
  const [envelopes, setEnvelopes] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [txData, envData] = await Promise.all([
        api.getTransactions(token, { limit: 500 }),
        api.getEnvelopes(token)
      ])

      if (txData.transactions) {
        const uncat = txData.transactions.filter(t => !t.envelope_id && t.amount < 0)
        setUncategorized(uncat)
      }
      if (envData.envelopes) setEnvelopes(envData.envelopes)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCategorize = async (envelopeId) => {
    try {
      const tx = uncategorized[currentIndex]
      await api.categorizeTransaction(token, tx.id, envelopeId, false)

      // Move to next transaction
      if (currentIndex < uncategorized.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        navigate('/')
      }
    } catch (err) {
      console.error('Failed to categorize:', err)
    }
  }

  const handleSkip = () => {
    if (currentIndex < uncategorized.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      navigate('/')
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>

  if (uncategorized.length === 0) {
    return (
      <div className="container">
        <div className="card">
          <h2>All transactions categorized! 🎉</h2>
          <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '20px' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentTx = uncategorized[currentIndex]

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Categorize Transactions</h1>

      <div className="card">
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Transaction {currentIndex + 1} of {uncategorized.length}
        </p>

        {/* Transaction Details */}
        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '5px', marginBottom: '20px' }}>
          <h2>{currentTx.merchant_name || currentTx.description || 'Transaction'}</h2>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#f44336', marginTop: '10px' }}>
            ${Math.abs(parseFloat(currentTx.amount)).toFixed(2)}
          </p>
          <p style={{ color: '#666', marginTop: '10px' }}>
            {new Date(currentTx.date).toLocaleDateString()}
          </p>
          {currentTx.plaid_category && (
            <p style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
              Plaid Category: {currentTx.plaid_category}
            </p>
          )}
        </div>

        {/* Envelope Selection */}
        <div className="form-group">
          <label>Select Envelope</label>
          <select id="envelope-select" defaultValue="">
            <option value="" disabled>Choose an envelope...</option>
            {envelopes.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={handlePrevious}
            className="btn btn-secondary"
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>
          <button
            onClick={handleSkip}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Skip
          </button>
          <button
            onClick={() => {
              const select = document.getElementById('envelope-select')
              if (select.value) {
                handleCategorize(parseInt(select.value))
              }
            }}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            Categorize
          </button>
          <button
            onClick={handleSkip}
            className="btn btn-secondary"
            disabled={currentIndex >= uncategorized.length - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

export default Categorization
