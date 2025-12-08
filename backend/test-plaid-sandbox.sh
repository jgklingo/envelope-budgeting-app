#!/bin/bash

# Plaid Sandbox Test Script
# This script demonstrates the full Plaid integration flow using sandbox mode
# No real bank account or payment required!

BASE_URL="http://localhost:3000"
EMAIL="plaidtest$(date +%s)@example.com"
PASSWORD="TestPass123!"
NAME="Plaid Test User"

echo "=== Plaid Sandbox Integration Test ==="
echo ""
echo "NOTE: This uses Plaid's FREE sandbox environment with fake data"
echo ""

# Step 1: Register and login
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")

USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
echo "User ID: $USER_ID"

# Verify user
echo "Verifying user in Cognito..."
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $COGNITO_USER_POOL_ID \
  --username $EMAIL \
  --region us-east-1 > /dev/null 2>&1

echo ""
echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Access Token: ${TOKEN:0:50}..."
echo ""

# Step 2: Create Link Token
echo "3. Creating Plaid Link Token..."
LINK_RESPONSE=$(curl -s -X POST "$BASE_URL/plaid/link-token" \
  -H "Authorization: Bearer $TOKEN")
LINK_TOKEN=$(echo "$LINK_RESPONSE" | grep -o '"link_token":"[^"]*' | cut -d'"' -f4)
echo "$LINK_RESPONSE" | json_pp
echo ""

echo "==============================================="
echo "IMPORTANT: In Plaid Sandbox, use these test credentials:"
echo ""
echo "Institution: First Platypus Bank (or any sandbox institution)"
echo "Username: user_good"
echo "Password: pass_good"
echo ""
echo "This will give you fake transactions to test with!"
echo "==============================================="
echo ""

# Step 3: Exchange Public Token
# In a real app, the frontend would use Plaid Link UI to get the public token
# For sandbox testing, we can use the Plaid API directly
echo "4. Simulating Plaid Link flow in sandbox..."
echo "   (In production, this happens in the frontend UI)"
echo ""

# Use Node.js to simulate the Plaid Link flow
node -e "
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SANDBOX_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

(async () => {
  try {
    // Create sandbox public token for testing
    const response = await client.sandboxPublicTokenCreate({
      institution_id: 'ins_109508',  // First Platypus Bank
      initial_products: ['transactions'],
    });
    
    console.log('Public Token created:', response.data.public_token.substring(0, 50) + '...');
    console.log('');
    
    // Exchange it for access token via our API
    const axios = require('axios');
    const exchangeResponse = await axios.post('$BASE_URL/plaid/exchange-token', {
      public_token: response.data.public_token
    }, {
      headers: {
        'Authorization': 'Bearer $TOKEN',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('5. Token Exchange Result:');
    console.log(JSON.stringify(exchangeResponse.data, null, 2));
    console.log('');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
})();
" 2>&1

if [ $? -ne 0 ]; then
  echo "Failed to exchange token. Make sure you have plaid and axios installed:"
  echo "npm install plaid axios"
  exit 1
fi

# Step 4: Sync Transactions
echo "6. Syncing transactions from Plaid sandbox..."
sleep 2
SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/plaid/sync" \
  -H "Authorization: Bearer $TOKEN")
echo "$SYNC_RESPONSE" | json_pp
echo ""

# Step 5: View Synced Transactions
echo "7. Viewing synced transactions..."
TRANSACTIONS=$(curl -s "$BASE_URL/transactions" \
  -H "Authorization: Bearer $TOKEN")
echo "$TRANSACTIONS" | json_pp
echo ""

# Count transactions
TRANSACTION_COUNT=$(echo "$TRANSACTIONS" | grep -o '"id"' | wc -l)
echo "Total transactions synced: $TRANSACTION_COUNT"
echo ""

# Step 6: View Uncategorized Transactions
echo "8. Checking uncategorized transactions (need manual categorization)..."
UNCAT=$(curl -s "$BASE_URL/transactions?uncategorized=true" \
  -H "Authorization: Bearer $TOKEN")
echo "$UNCAT" | json_pp
echo ""

echo "=== Plaid Sandbox Test Complete ==="
echo ""
echo "Summary:"
echo "- Used Plaid's FREE sandbox environment"
echo "- Linked fake 'First Platypus Bank' account"
echo "- Synced fake transaction data"
echo "- All transactions imported into your database"
echo ""
echo "Next Steps:"
echo "1. Create envelopes with rules"
echo "2. Run /plaid/sync again to auto-categorize transactions"
echo "3. Manually categorize remaining transactions"
