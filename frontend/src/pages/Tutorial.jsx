function Tutorial() {
  return (
    <div className="container">
      <h1 style={{ marginBottom: '20px' }}>Tutorial: Envelope Budgeting</h1>

      <div className="card">
        <h2>What is Envelope Budgeting?</h2>
        <p style={{ lineHeight: '1.6', marginTop: '10px' }}>
          Envelope budgeting is a simple, time-tested budgeting method where you divide your income into
          different "envelopes" representing spending categories. Each envelope has a specific amount of
          money allocated to it, and once an envelope is empty, you can't spend in that category until
          the next budget period.
        </p>
      </div>

      <div className="card">
        <h2>How This App Works</h2>
        <div style={{ lineHeight: '1.6' }}>
          <p style={{ marginBottom: '15px' }}>
            <strong>1. Connect Your Bank:</strong> Link your bank account through Plaid to automatically
            sync your transactions. Go to Settings to connect your account.
          </p>
          <p style={{ marginBottom: '15px' }}>
            <strong>2. Create Envelopes:</strong> Set up envelopes for your spending categories
            (Groceries, Rent, Entertainment, etc.) and assign a monthly budget amount to each one.
          </p>
          <p style={{ marginBottom: '15px' }}>
            <strong>3. Categorize Transactions:</strong> When new transactions come in, the app will
            try to categorize them automatically. You can review and adjust categorizations as needed.
          </p>
          <p style={{ marginBottom: '15px' }}>
            <strong>4. Track Your Spending:</strong> Watch your envelope balances to see how much you
            have left to spend in each category. The app will show you when you're getting low.
          </p>
          <p>
            <strong>5. Stay on Budget:</strong> If an envelope runs low or goes negative, you'll know
            you need to cut back in that category or reallocate funds from another envelope.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Key Features</h2>
        <div style={{ lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            <strong>Automatic Sync:</strong> Transactions are pulled from your bank daily via Plaid.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>Smart Categorization:</strong> The app learns your spending patterns and
            automatically categorizes transactions.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>Rollover Option:</strong> Choose whether envelope balances reset each month or
            roll over to the next period.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>Cloud Sync:</strong> Your data is saved in the cloud and accessible from any device.
          </p>
          <p>
            <strong>Offline Access:</strong> View your transactions and balances even without an
            internet connection.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Tips for Success</h2>
        <div style={{ lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            • <strong>Be realistic:</strong> Set envelope amounts based on your actual spending habits,
            not wishful thinking.
          </p>
          <p style={{ marginBottom: '10px' }}>
            • <strong>Review regularly:</strong> Check your envelopes weekly to stay aware of your spending.
          </p>
          <p style={{ marginBottom: '10px' }}>
            • <strong>Adjust as needed:</strong> It's okay to modify envelope amounts as you learn what
            works for you.
          </p>
          <p style={{ marginBottom: '10px' }}>
            • <strong>Include savings:</strong> Create envelopes for savings goals, not just expenses.
          </p>
          <p>
            • <strong>Stay consistent:</strong> The key to budgeting success is forming a habit of
            regular tracking.
          </p>
        </div>
      </div>

      <div className="card" style={{ background: '#e8f5e9' }}>
        <h2>Getting Started</h2>
        <p style={{ marginBottom: '15px' }}>
          Ready to take control of your finances? Start by creating a few basic envelopes in the
          Settings page, then sync your transactions. You'll be budgeting like a pro in no time!
        </p>
        <a href="/settings" className="btn btn-primary">
          Go to Settings
        </a>
      </div>
    </div>
  )
}

export default Tutorial
