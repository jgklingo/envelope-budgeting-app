# Envelope Budgeting App
This project is a budgeting app that prioritizes ease of use and simplicity, enabling anyone to create a budget and start improving their financial wellbeing with minimal time investment. Budgeting apps are a pretty saturated space, but many of them are overly complicated and require too much work for people to stick with them. Even worse, many of them follow a subscription monetization model, and the last thing that someone working to improve their finances needs is another subscription. This app aims to address these and other issues, making simple, straightforward budgeting more accessible to the masses.
 
### Key Features
- Follows the envelope budgeting system, where all incoming money is divided into different spending (and savings) envelopes. Outgoing money is subtracted from the envelopes based on category, and the app shows how much money is remaining in each envelope.
- Envelopes can be set up and forgotten, or adjusted as time goes on. Each envelope takes a percentage or constant amount of your incoming money.
- Ideally, Plaid APIs (or similar) will be used to pull transaction (income and expense) data directly from your financial institution. If this is not feasible, this data will be entered manually through a simple form in the app.
  - Plaid or the user will categorize the transaction, and the app will use the category to determine which envelope it should count against.
 
### Requirements
##### Frontend
- Setup/settings page
  - Can set interval of time on which the envelopes refresh (default monthly)
  - Can create new envelopes and set their amounts
    - Amounts can be fixed amounts or a percentage of income from the current or previous interval
  - Can configure which Plaid categories correspond to the envelope
  - Can set envelopes to refresh or rollover, where envelopes that refresh reset to their configured amounts at the start of each interval and rollover envelopes keep a running total between intervals
  - Can set push notifications when certain thresholds are reached in an envelope
- Main screen that opens on launch
  - Total money in and out during the interval
  - A list of transactions to be categorized, which brings you to the Categorization screen when clicked
  - Amount remaining in each envelope
    - Expands when clicked to show the most recent transactions (in and out) in that category during the interval and a button to go to the envelope screen
    - Settings icon to jump to the settings page where the envelope amount can be configured
- Envelope screen
  - Shows a list of transactions assigned to that envelope (money in and out)
  - Clicking on a transaction expands it and provides more details (why it was categorized that way?)
  - A button next to each expense transaction allows it to be recategorized to a different envelope
    - A popup asks if this is a one-time recategorization or if the app should try to put all future matching transactions into this envelope
  - A button next to each income transaction allows it to be fully or partially reallocated to a different envelope
- Categorization screen
  - Shows the amount of the transaction and other basic details
  - Includes a dropdown to select which envelope it should be in (with some suggetions?)
  - Can swipe left or right to move between uncategorized transactions
- Tutorial screen
  - Contains information about the envelope budgeting system and how to use the app
- Local storage
  - Transactions are saved locally each time they are synced from the backend, allowing the app to work offline
##### Backend
- Login functionality
  - Envelopes and transactions are saved in the cloud and can be accessed from any device
  - To start, authentication will be based only on email/password
- Backend will pull in transactions from the Plaid Transactions API regularly (`/transactions/sync`)
  - This will occur daily to start, since this is the frequency with which Plaid is updated
  - Amount, date, description, and merchant name will all be used directly in the app. Category can be used for automatic envelope categorization.
  - New transactions will automatically be allocated based on the envelope rules, which are also saved on the backend

### Entity-Relationship Diagram
![Entity-Relationship Diagram](/media/Final%20Project%20ERD.png)

### System Design
![System Design Diagram](media/Final%20Project%20System%20Design.png)
