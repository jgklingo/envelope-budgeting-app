# Plan: Envelope Budgeting App Implementation
A React Native mobile app with cloud backend that implements envelope budgeting with Plaid transaction sync. The plan is divided into user setup tasks (AWS, Plaid) and development phases (backend API, frontend screens, integration).

### Steps
1. User Setup: AWS Infrastructure & Plaid Account
    - Create AWS account and set up: RDS PostgreSQL instance, Lambda function for daily sync, API Gateway for REST endpoints, Cognito for authentication
    - Register Plaid developer account, get sandbox API keys, create Link token endpoint
    - Configure environment variables and security groups for services
2. Backend Development: Core API & Database
    - Design PostgreSQL schema from ERD (users, envelopes, transactions, envelope_rules, notification_settings tables)
    - Implement REST API endpoints: authentication (POST /register, POST /login), envelopes (GET/POST/PUT/DELETE /envelopes), transactions (GET /transactions, PUT /transactions/:id/categorize, POST /transactions/:id/reallocate), Plaid (POST /plaid/link-token, POST /plaid/exchange-token)
    - Build envelope allocation logic: when income transaction syncs, distribute to envelopes based on percentage/fixed rules; handle edge cases (percentages ≠100%, negative envelopes)
    - Create Lambda function for daily Plaid /transactions/sync with automatic categorization based on envelope_rules mappings
3. Backend Development: Business Logic & Rules
    - Implement transaction-to-envelope matching: map Plaid categories to user envelopes via envelope_rules, apply custom user rules from recategorization history
    - Build interval management: calculate current interval boundaries (monthly default), determine if envelopes should refresh or rollover at interval start
    - Add notification threshold checking: monitor envelope balances, trigger push notifications via AWS SNS when thresholds crossed
4. Frontend Development: Authentication & Core Screens
    - Set up React Native project with navigation (React Navigation), configure Expo for push notifications
    - Build authentication screens: registration, login, use AWS Cognito SDK for token management
    - Implement Main Screen: display interval totals (money in/out), uncategorized transactions list, envelope list with expand/collapse for recent transactions, pull-to-refresh for backend sync
    - Create local storage using AsyncStorage: cache transactions and envelopes, enable offline viewing
5. Frontend Development: Envelope Management & Settings
    - Build Settings/Setup Page: interval picker (weekly/monthly/custom), envelope CRUD with amount type selector (fixed/$, percentage of current/previous income), Plaid category mapping dropdowns, refresh vs rollover toggle, notification threshold inputs
    - Implement Envelope Screen: filterable transaction list, expandable transaction details showing categorization reason, recategorization button with "one-time or always" popup, income reallocation modal with amount input and target envelope selector
    - Create Categorization Screen: swipeable transaction cards, envelope dropdown with AI/rule-based suggestions, confirm/skip buttons
6. Integration & Polish
    - Integrate Plaid Link SDK: implement Plaid Link flow in-app, exchange public token for access token, store in backend securely
    - Connect all frontend screens to backend API: implement error handling, loading states, optimistic UI updates
    - Add Tutorial Screen: carousel explaining envelope budgeting, app navigation guide, sample data walkthrough
    - Test daily sync Lambda: verify Plaid webhook handling, validate allocation logic with various income scenarios, test interval rollovers

### Further Considerations
1. Plaid Costs & Fallback: Plaid Development (free) limits to 100 items/user. Will this suffice for testing, or implement manual transaction entry form now as backup? Suggest adding simple "Add Transaction" button on Main Screen early.
2. Negative Envelope Handling: Requirements don't specify behavior when spending exceeds envelope. Recommend: allow negative but show red warning indicator, or block transaction recategorization if it would make envelope negative? Choose one for implementation.
3. Historical Transaction Import: On first Plaid connection, import all available history or only forward? Suggest: import last 90 days into current interval for realistic envelope calculations.
4. Push Notification Testing: AWS SNS requires device tokens and app certificates. For 30-hour scope, consider making notifications "nice to have" vs MVP-blocking. Could stub with in-app alerts initially.
5. Multi-bank Support: Requirements mention "financial institution" (singular). Confirm if users link one bank only, or implement multi-account aggregation? Single-account significantly reduces complexity.