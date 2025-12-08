import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function Transactions({ token }) {
  const [transactions, setTransactions] = useState([])
  const [envelopes, setEnvelopes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

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
      
      if (Array.isArray(txData)) setTransactions(txData)
      if (envData.envelopes) setEnvelopes(envData.envelopes)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true
    if (filter === 'income') return tx.type === 'INCOME'
    if (filter === 'expenses') return tx.type === 'EXPENSE'
    if (filter === 'uncategorized') return !tx.is_categorized
    return true
  })

  const getEnvelopeName = (envelopeId) => {
    const env = envelopes.find(e => e.id === envelopeId)
    return env ? env.name : 'Uncategorized'
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>All Transactions</h1>

      {/* Filter */}
      <div className="card">
        <div className="form-group">
          <label>Filter</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expenses">Expenses Only</option>
            <option value="uncategorized">Uncategorized Only</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="card">
          <p>No transactions found.</p>
        </div>
      ) : (
        <div>
          <p style={{ margin: '15px 0', color: '#666' }}>Showing {filteredTransactions.length} transactions</p>
          {filteredTransactions.map(tx => (
            <div key={tx.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3>{tx.merchant_name || tx.description || 'Transaction'}</h3>
                  <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                    {new Date(tx.datetime).toLocaleDateString()} • {getEnvelopeName(tx.envelope_id)}
                  </p>
                  {tx.plaid_category && (
                    <p style={{ fontSize: '12px', color: '#999' }}>Category: {tx.plaid_category}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: tx.type === 'EXPENSE' ? '#f44336' : '#4CAF50' }}>
                    {tx.type === 'EXPENSE' ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Transactions
