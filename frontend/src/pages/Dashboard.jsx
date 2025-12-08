import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

function Dashboard({ token }) {
  const [envelopes, setEnvelopes] = useState([])
  const [transactions, setTransactions] = useState([])
  const [uncategorized, setUncategorized] = useState([])
  const [userSettings, setUserSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedEnvelope, setExpandedEnvelope] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const getCurrentPeriodDates = (settings) => {
    if (!settings.interval_start_date || !settings.interval_type) return { start: null, end: null }

    // Parse the start date and extract just the date part (YYYY-MM-DD)
    const datePart = settings.interval_start_date.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)

    // Create date using UTC to avoid timezone issues
    const startDate = new Date(Date.UTC(year, month - 1, day))
    const today = new Date()

    // Calculate how many periods have passed
    let periodStart = new Date(startDate.getTime())

    while (periodStart <= today) {
      const nextPeriod = new Date(periodStart.getTime())

      switch (settings.interval_type) {
        case 'WEEKLY':
          nextPeriod.setUTCDate(nextPeriod.getUTCDate() + 7)
          break
        case 'BIWEEKLY':
          nextPeriod.setUTCDate(nextPeriod.getUTCDate() + 14)
          break
        case 'MONTHLY':
          nextPeriod.setUTCMonth(nextPeriod.getUTCMonth() + 1)
          break
        case 'YEARLY':
          nextPeriod.setUTCFullYear(nextPeriod.getUTCFullYear() + 1)
          break
      }

      if (nextPeriod > today) break
      periodStart = new Date(nextPeriod.getTime())
    }

    const periodEnd = new Date(periodStart.getTime())
    switch (settings.interval_type) {
      case 'WEEKLY':
        periodEnd.setUTCDate(periodEnd.getUTCDate() + 7)
        break
      case 'BIWEEKLY':
        periodEnd.setUTCDate(periodEnd.getUTCDate() + 14)
        break
      case 'MONTHLY':
        periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
        break
      case 'YEARLY':
        periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1)
        break
    }

    return { start: periodStart, end: periodEnd }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [envData, txData, settingsData] = await Promise.all([
        api.getEnvelopes(token),
        api.getTransactions(token, { limit: 1000 }),
        api.getUserSettings(token)
      ])

      if (Array.isArray(envData)) setEnvelopes(envData)
      if (settingsData) setUserSettings(settingsData)

      if (Array.isArray(txData)) {
        // Filter transactions by current period
        const { start, end } = getCurrentPeriodDates(settingsData)
        console.log('Period:', { start, end })
        console.log('Total transactions:', txData.length)

        const filtered = start ? txData.filter(t => {
          const txDate = new Date(t.datetime)
          return txDate >= start && txDate < end
        }) : txData

        console.log('Filtered transactions:', filtered.length)
        console.log('Sample transaction date:', txData[0]?.datetime)

        setTransactions(filtered)
        setUncategorized(filtered.filter(t => !t.is_categorized))
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
                      <div style={{ fontSize: '12px', color: '#666' }}>{new Date(tx.datetime).toLocaleDateString()}</div>
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
