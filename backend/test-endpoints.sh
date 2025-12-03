#!/bin/bash

# Envelope Budgeting App - API Test Script
# Usage: ./test-endpoints.sh

BASE_URL="http://localhost:3000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="TestPass123!"
NAME="Test User"

echo "=== Envelope Budgeting App API Tests ==="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health" | json_pp
echo ""

# Test 2: Register User
echo "2. Registering new user..."
echo "Email: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}")

echo "$REGISTER_RESPONSE" | json_pp
USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
echo "User ID: $USER_ID"
echo ""

echo "NOTE: You need to verify your email in Cognito before logging in."
echo "For testing, you can verify via AWS Console or CLI:"
echo "aws cognito-idp admin-confirm-sign-up --user-pool-id \$COGNITO_USER_POOL_ID --username $EMAIL"
echo ""
read -p "Press enter once email is verified..."

# Test 3: Login
echo "3. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$LOGIN_RESPONSE" | json_pp
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Access Token: ${TOKEN:0:50}..."
echo ""

if [ -z "$TOKEN" ]; then
  echo "Login failed. Exiting."
  exit 1
fi

# Test 4: Create Envelope
echo "4. Creating envelope..."
ENVELOPE_RESPONSE=$(curl -s -X POST "$BASE_URL/envelopes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Groceries",
    "amount_type": "FIXED",
    "amount": 500.00,
    "refresh_type": "REFRESH",
    "rules": [
      {
        "plaid_category": "FOOD_AND_DRINK",
        "merchant_pattern": "Whole Foods"
      }
    ]
  }')

echo "$ENVELOPE_RESPONSE" | json_pp
ENVELOPE_ID=$(echo "$ENVELOPE_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Envelope ID: $ENVELOPE_ID"
echo ""

# Test 5: Get Envelopes
echo "5. Getting all envelopes..."
curl -s "$BASE_URL/envelopes" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 6: Create Transaction
echo "6. Creating manual transaction..."
TRANSACTION_RESPONSE=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"amount\": 45.67,
    \"type\": \"EXPENSE\",
    \"datetime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"description\": \"Grocery shopping\",
    \"merchant_name\": \"Whole Foods\",
    \"envelope_id\": \"$ENVELOPE_ID\"
  }")

echo "$TRANSACTION_RESPONSE" | json_pp
TRANSACTION_ID=$(echo "$TRANSACTION_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Transaction ID: $TRANSACTION_ID"
echo ""

# Test 7: Get Transactions
echo "7. Getting all transactions..."
curl -s "$BASE_URL/transactions" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 8: Get Transactions for Envelope
echo "8. Getting transactions for envelope..."
curl -s "$BASE_URL/transactions?envelope_id=$ENVELOPE_ID" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 9: Get Envelope Rules
echo "9. Getting envelope rules..."
curl -s "$BASE_URL/envelopes/$ENVELOPE_ID/rules" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 10: Add Envelope Rule
echo "10. Adding new envelope rule..."
curl -s -X POST "$BASE_URL/envelopes/$ENVELOPE_ID/rules" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "plaid_category": "FOOD_AND_DRINK",
    "merchant_pattern": "Trader Joes"
  }' | json_pp
echo ""

# Test 11: Update Envelope
echo "11. Updating envelope..."
curl -s -X PUT "$BASE_URL/envelopes/$ENVELOPE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Groceries & Dining",
    "amount": 600.00
  }' | json_pp
echo ""

# Test 12: Create Second Envelope
echo "12. Creating second envelope..."
ENVELOPE2_RESPONSE=$(curl -s -X POST "$BASE_URL/envelopes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Gas & Transportation",
    "amount_type": "FIXED",
    "amount": 200.00,
    "refresh_type": "ROLLOVER"
  }')

ENVELOPE2_ID=$(echo "$ENVELOPE2_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Second Envelope ID: $ENVELOPE2_ID"
echo ""

# Test 13: Create Uncategorized Transaction
echo "13. Creating uncategorized transaction..."
UNCAT_TRANSACTION=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"amount\": 75.00,
    \"type\": \"EXPENSE\",
    \"datetime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"description\": \"Random purchase\",
    \"merchant_name\": \"Amazon\"
  }")

UNCAT_TX_ID=$(echo "$UNCAT_TRANSACTION" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Uncategorized Transaction ID: $UNCAT_TX_ID"
echo ""

# Test 14: Get Uncategorized Transactions
echo "14. Getting uncategorized transactions..."
curl -s "$BASE_URL/transactions?uncategorized=true" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 15: Categorize Transaction
echo "15. Categorizing transaction..."
curl -s -X PUT "$BASE_URL/transactions/$UNCAT_TX_ID/categorize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"envelope_id\": \"$ENVELOPE2_ID\",
    \"apply_rule\": true
  }" | json_pp
echo ""

# Test 16: Create Income Transaction
echo "16. Creating income transaction..."
INCOME_TX=$(curl -s -X POST "$BASE_URL/transactions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"amount\": 3000.00,
    \"type\": \"INCOME\",
    \"datetime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"description\": \"Salary\",
    \"envelope_id\": \"$ENVELOPE_ID\"
  }")

INCOME_TX_ID=$(echo "$INCOME_TX" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Income Transaction ID: $INCOME_TX_ID"
echo ""

# Test 17: Reallocate Income
echo "17. Reallocating income transaction..."
curl -s -X POST "$BASE_URL/transactions/$INCOME_TX_ID/reallocate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"envelope_id\": \"$ENVELOPE2_ID\"
  }" | json_pp
echo ""

# Test 18: Get Envelopes with Balances
echo "18. Getting envelopes with updated balances..."
curl -s "$BASE_URL/envelopes" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

# Test 19: Plaid Link Token
echo "19. Creating Plaid Link token..."
curl -s -X POST "$BASE_URL/plaid/link-token" \
  -H "Authorization: Bearer $TOKEN" | json_pp
echo ""

echo "=== All Tests Complete ==="
