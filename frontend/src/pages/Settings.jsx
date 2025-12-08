import { useState, useEffect } from 'react'
import { api } from '../utils/api'

function Settings({ token }) {
  const [envelopes, setEnvelopes] = useState([])
  const [userSettings, setUserSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingEnvelope, setEditingEnvelope] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    rollover: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [envData, settingsData] = await Promise.all([
        api.getEnvelopes(token),
        api.getUserSettings(token)
      ])
      if (Array.isArray(envData)) setEnvelopes(envData)
      if (settingsData) setUserSettings(settingsData)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Map frontend formData to backend schema
      const envelopeData = {
        name: formData.name,
        amount_type: 'FIXED',
        amount: parseFloat(formData.amount),
        refresh_type: formData.rollover ? 'ROLLOVER' : 'REFRESH'
      }

      if (editingEnvelope) {
        await api.updateEnvelope(token, editingEnvelope.id, envelopeData)
      } else {
        await api.createEnvelope(token, envelopeData)
      }
      await loadData()
      setShowCreate(false)
      setEditingEnvelope(null)
      setFormData({ name: '', amount: '', rollover: false })
    } catch (err) {
      console.error('Failed to save envelope:', err)
      alert('Failed to save envelope: ' + (err.message || 'Unknown error'))
    }
  }

  const handleEdit = (envelope) => {
    setEditingEnvelope(envelope)
    setFormData({
      name: envelope.name,
      amount: envelope.amount,
      rollover: envelope.refresh_type === 'ROLLOVER'
    })
    setShowCreate(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this envelope?')) return
    try {
      await api.deleteEnvelope(token, id)
      await loadData()
    } catch (err) {
      console.error('Failed to delete envelope:', err)
    }
  }

  const handleIntervalUpdate = async (e) => {
    e.preventDefault()
    try {
      await api.updateUserSettings(token, {
        interval_type: userSettings.interval_type,
        interval_start_date: userSettings.interval_start_date
      })
      alert('Interval settings updated successfully!')
    } catch (err) {
      console.error('Failed to update interval:', err)
      alert('Failed to update settings')
    }
  }

  const handleCancel = () => {
    setShowCreate(false)
    setEditingEnvelope(null)
    setFormData({ name: '', amount: '', rollover: false })
  }

  if (loading) return <div className="container"><div className="loading">Loading...</div></div>

  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Settings</h1>

      {/* Budget Interval Section */}
      <div className="card">
        <h2>Budget Interval</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Configure how often your envelopes refresh.
        </p>
        <form onSubmit={handleIntervalUpdate}>
          <div className="form-group">
            <label>Interval Type</label>
            <select
              value={userSettings.interval_type || 'MONTHLY'}
              onChange={(e) => setUserSettings({ ...userSettings, interval_type: e.target.value })}
            >
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Bi-Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={userSettings.interval_start_date?.split('T')[0] || ''}
              onChange={(e) => setUserSettings({ ...userSettings, interval_start_date: e.target.value })}
              required
            />
            <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
              The date when your budget period starts (e.g., paycheck date)
            </small>
          </div>
          <button type="submit" className="btn btn-primary">
            Save Interval Settings
          </button>
        </form>
      </div>

      {/* Bank Sync Section */}
      <div className="card">
        <h2>Bank Connection</h2>
        <p style={{ color: '#666', marginBottom: '15px' }}>
          Sync transactions from your bank account using Plaid.
        </p>
        <button
          onClick={async () => {
            try {
              // For sandbox testing, we'll simulate the Plaid Link flow
              const confirmed = confirm(
                'SANDBOX MODE: This will simulate connecting to "First Platypus Bank" (Plaid test bank).\n\n' +
                'In production, this would open Plaid Link UI for real bank selection.\n\n' +
                'Continue?'
              )

              if (!confirmed) return

              // Step 1: Get link token
              const linkData = await api.getLinkToken(token)
              console.log('Link token created')

              // Step 2: Simulate Plaid Link - create sandbox public token
              const response = await fetch('http://localhost:3000/plaid/sandbox-link', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              })
              const { public_token } = await response.json()
              console.log('Sandbox public token created')

              // Step 3: Exchange public token for access token
              await api.exchangePublicToken(token, public_token)

              alert('✓ Bank account connected successfully!\n\nYou can now sync transactions from the Dashboard.')
            } catch (err) {
              console.error('Failed to connect bank:', err)
              alert('Failed to connect bank account: ' + (err.message || 'Unknown error'))
            }
          }}
          className="btn btn-primary"
        >
          Connect Bank Account (Sandbox)
        </button>
      </div>

      {/* Envelopes Section */}
      <h2 style={{ marginTop: '30px', marginBottom: '15px' }}>Manage Envelopes</h2>

      {!showCreate && (
        <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ marginBottom: '20px' }}>
          + Create New Envelope
        </button>
      )}

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="card">
          <h3>{editingEnvelope ? 'Edit Envelope' : 'Create New Envelope'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Envelope Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Groceries, Rent, Entertainment"
              />
            </div>
            <div className="form-group">
              <label>Monthly Budget Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="e.g., 500.00"
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.rollover}
                  onChange={(e) => setFormData({ ...formData, rollover: e.target.checked })}
                  style={{ marginRight: '10px', width: 'auto' }}
                />
                Rollover unused balance to next period
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary">
                {editingEnvelope ? 'Update Envelope' : 'Create Envelope'}
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Envelopes List */}
      {envelopes.length === 0 ? (
        <div className="card">
          <p>No envelopes yet. Create one to get started!</p>
        </div>
      ) : (
        envelopes.map(env => (
          <div key={env.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3>{env.name}</h3>
                <p style={{ color: '#666', marginTop: '5px' }}>
                  Budget: ${parseFloat(env.amount).toFixed(2)} / month
                </p>
                <p style={{ color: '#666' }}>
                  Current Balance: ${parseFloat(env.current_balance || 0).toFixed(2)}
                </p>
                <p style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
                  {env.refresh_type === 'ROLLOVER' ? '✓ Rollover enabled' : 'Resets each period'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEdit(env)} className="btn btn-secondary">
                  Edit
                </button>
                <button onClick={() => handleDelete(env.id)} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default Settings
