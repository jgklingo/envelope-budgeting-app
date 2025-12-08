# Envelope Budgeting App - Frontend

A simple React frontend for the envelope budgeting application.

## Getting Started

1. Install dependencies (already done):
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## Features Implemented

### Authentication
- Login page with email/password
- Registration page with password confirmation
- Token-based authentication stored in localStorage

### Dashboard (Main Screen)
- Summary cards showing income, expenses, and uncategorized transactions
- Sync button to fetch latest transactions from Plaid
- Expandable envelope cards showing recent transactions
- Quick links to categorization and settings

### Envelopes Page
- View all envelopes with current balances
- Filter transactions by envelope
- Recategorize expense transactions (one-time or with rule)
- Reallocate income transactions to different envelopes
- Expandable transaction details

### Transactions Page
- View all transactions with filtering options
- Filter by: all, income, expenses, uncategorized
- Shows envelope assignments and amounts

### Categorization Page
- Swipeable interface for uncategorized transactions
- Select envelope for each transaction
- Previous/Next navigation
- Skip functionality for later categorization

### Settings Page
- Create, edit, and delete envelopes
- Set envelope budgets (monthly amounts)
- Toggle rollover vs reset behavior
- Connect bank account (Plaid Link token generation)

### Tutorial Page
- Introduction to envelope budgeting
- How-to guide for using the app
- Tips for budgeting success

## API Integration

The frontend uses a proxy configuration in `vite.config.js` to forward `/api/*` requests to the backend at `http://localhost:3000`.

All API calls are centralized in `src/utils/api.js`.

## Architecture

- **React** - UI library
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Native Fetch API** - HTTP requests to backend

## File Structure

```
frontend/
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main app component with routing
    ├── index.css           # Global styles
    ├── components/
    │   └── Navbar.jsx      # Navigation bar
    ├── pages/
    │   ├── Login.jsx       # Login page
    │   ├── Register.jsx    # Registration page
    │   ├── Dashboard.jsx   # Main dashboard
    │   ├── Envelopes.jsx   # Envelope details view
    │   ├── Transactions.jsx # All transactions view
    │   ├── Categorization.jsx # Transaction categorization
    │   ├── Settings.jsx    # Settings and envelope management
    │   └── Tutorial.jsx    # Tutorial/help page
    └── utils/
        └── api.js          # API client functions
```

## Notes

- The app requires the backend to be running on port 3000
- Authentication token is stored in localStorage
- All protected routes require a valid JWT token
- Offline viewing is supported through local state caching
