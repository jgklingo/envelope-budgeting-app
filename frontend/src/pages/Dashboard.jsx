import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function Dashboard({ token }) {
  const [envelopes, setEnvelopes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [uncategorized, setUncategorized] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedEnvelope, setExpandedEnvelope] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [envData, txData] = await Promise.all([
        api.getEnvelopes(token),
        api.getTransactions(token, { limit: 100 })
      ])

      if (envData.envelopes) setEnvelopes(envData.envelopes)
      if (Array.isArray(txData)) {
        setTransactions(txData)
        setUncategorized(txData.filter(t => !t.is_categorized))
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.syncTransactions(token)
      await loadData()
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  const calculateTotals = () => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + parseFloat(t.amount), 0)
    const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + parseFloat(t.amount), 0)
    return { income, expenses }
  }

  const getEnvelopeTransactions = (envelopeId) => {
    return transactions.filter(t => t.envelope_id === envelopeId).slice(0, 5)
  }

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>

  const totals = calculateTotals()

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Dashboard</h1>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ background: '#e8f5e9' }}>
          <h3>Income This Period</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>${totals.income.toFixed(2)}</p>
        </div>
        <div className="card" style={{ background: '#ffebee' }}>
          <h3>Expenses This Period</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>${totals.expenses.toFixed(2)}</p>
        </div>
        <div className="card" style={{ background: '#fff3e0' }}>
          <h3>Uncategorized</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9800' }}>{uncategorized.length}</p>
          {uncategorized.length > 0 && (
            <button onClick={() => navigate('/categorization')} className="btn btn-secondary" style={{ marginTop: '10px' }}>
              Categorize Now
            </button>
          )}
        </div>
      </div>

      {/* Sync Button */}
      <div className="card">
        <button onClick={handleSync} className="btn btn-primary" disabled={syncing}>
          {syncing ? 'Syncing...' : 'Sync Transactions'}
        </button>
      </div>

      {/* Envelopes */}
      <h2 style={{ marginTop: '30px', marginBottom: '15px' }}>Envelopes</h2>
      {envelopes.length === 0 ? (
        <div className="card">
          <p>No envelopes yet. <a href="/settings">Create one in Settings</a></p>
        </div>
      ) : (
        envelopes.map(env => (
          <div key={env.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedEnvelope(expandedEnvelope === env.id ? null : env.id)}>
              <div>
                <h3>{env.name}</h3>
                <p style={{ color: parseFloat(env.current_balance) < 0 ? '#f44336' : '#666' }}>
                  Balance: ${parseFloat(env.current_balance || 0).toFixed(2)} / ${parseFloat(env.amount).toFixed(2)}
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); navigate('/settings') }} className="btn btn-secondary">⚙️</button>
            </div>

            {expandedEnvelope === env.id && (
              <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <h4>Recent Transactions</h4>
                {getEnvelopeTransactions(env.id).map(tx => (
                  <div key={tx.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>{tx.merchant_name || tx.description || 'Transaction'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{new Date(tx.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', color: tx.amount < 0 ? '#f44336' : '#4CAF50' }}>
                      ${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate('/envelopes')} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                  View All Transactions
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default Dashboard
