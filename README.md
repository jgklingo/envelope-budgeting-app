# Envelope Budgeting App

### Project Summary
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
  - A button next to each income transaction allows it to be reallocated to a different envelope (full reallocation only)
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
  - Transfer transactions (between accounts) will be filtered out and not stored or displayed
  - New transactions will automatically be allocated based on the envelope rules, which are also saved on the backend
  - Transactions that don't match any rule will remain uncategorized and appear in the categorization list on the main screen

### Entity-Relationship Diagram
![Entity-Relationship Diagram](/media/Final%20Project%20ERD.png)

### System Design
![System Design Diagram](media/Final%20Project%20System%20Design.png)

### What I Learned (Key Learnings)
- AI is an extremely effective tool for fleshing out requirements. I wrote the initial list, then had AI fill in any gaps and ask me questions about areas that were underrepresented. It resulted in the much more thorough list of requirements that you see above.
- AWS is really hard to connect to from code if you can't find the right SDK. It took me a while to figure out how to run SQL queries on my AWS Aurora DSQL database, and I kept trying unsuccessfully to authenticate myself in different ways, but what finally fixed it was using the official connector package from NPM (which was not very well-advertised on the AWS help site).
- That said, AWS has really solid documentation. It took me a while to find the specific package that I needed, but I was able to learn a ton about the funcitonality of DSQL (especially the features of PostgreSQL that it did not support) and its scalability and redundancy characteristics.
- I also learned how to use Plaid APIs. Again, a very thorough API reference website was extremely helpful for this. I was surprised at how relatively easy it was to hook into a system that can pull financial records from nearly any bank in America, a testament to Plaid's value.
- SQL databases are great for storing transactional data. We talked about this in class and the Zybook, but Aurora DSQL lent itself really well to this use case and ensured that transactions were reliably stored without duplication.

### Integration with AI
I believe that Plaid uses AI to categorize the transactions, which I took advantage of in my app, but I did not implement AI myself for this project.

### Building with AI
- As mentioned above, I used AI to refine my requirements after coming up with my original idea. It was great at adding important functionality that I had missed in my first pass and suggesting edge cases to consider, especially regarding the challenge of syncing the data between multiple clients.
- I also used AI to generate code, which it was surprisingly good at. I think that a big contributor to the model's success in coding was the detailed list of requirements I created first. I made sure that it was always referring to that list so it would stick to my vision, and I used other prompt engineering skills to keep it on track.
- For the first time, I experimented with a coding agent on this project. I'm used to the chat interface where I can suggest edits and ask questions, but the agent was on another level. I could leave it to run, and it would iteratively solve problems in the codebase, using the command line to test its changes. It wasn't flawless, but it was a really cool indication of the direction that AI-assisted coding is going.

### Why This Project Interested Me
I've been looking for a free or ad-supported budgeting app like this for a while, and I'm a big fan of the envelope system conceptually. However, I recognize that for anyone to stick with a budgeting system long-term, it needs to be simple and low friction. That's why the idea of integrating with Plaid was so fascinating to me, because in theory you should be able to create a budget that needs very little manual intervention after the initial setup. I also appreciated the opportunity to make use of some cloud technologies, since I have a deep interest in cloud computing. I ended up using AWS Aurora DSQL, which is a new service offering from AWS, and it was really fun to learn about a state-of-the-art relational database system. I also implemented the registration and login with AWS Cognito, and it was cool to see how simple that made it to implement token-based authentication. I would definitely consider using a solution like that on future projects, since the identity management problem has been thoroughly solved and it takes a lot of redundant effort when you choose to solve it again yourself.

### Other Characteristics
- Failover Strategy: I didn't manually implement any failover strategy, but the Aurora DSQL database is highly resilient and repliated between many availablility zones, so from a database perspective, a failure would just cause requests to be routed to a different replica.
- Scaling Characteristics: Again, I didn't do this manually, but Aurora DSQL has essentially limitless scale that would ensure that the database was not the limiting factor. If I was actually deploying this app, I would probably want to split up my backend monolith into serverless functions that could be run in AWS Lambda, allowing them to handle virtually any scale necessary.
- Performance Characteristics: The only performance optimization I performed was sending the transactions to Aurora DSQL in batches. At first, I was sending each transaction in its own request, which was too slow even with only around 400 transactions. Once I batched the requests into a single request, it took only a few seconds. It's hard to accurately gauge my performance since I only tested the app locally (and my computer is slow), but it's safe to assume that the interface would have been plenty responsive.
- Authentication: As described under "Why This Project Interested Me," I used AWS Cognito for authentication, which basically solved the problem out of the box. It handles login and registration requests, email confirmation, and identity management with very limited effort on the part of the programmer.
- Concurrency: Not applicable.
