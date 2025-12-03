# Quick Start - Manual Testing Guide

## Available Endpoints

### Authentication
```bash
# Register
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!","name":"User"}'

# Login (after email verification)
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Pass123!"}'
```

### Envelopes (requires TOKEN)
```bash
TOKEN="your-access-token-here"

# List envelopes
curl http://localhost:3000/envelopes \
  -H "Authorization: Bearer $TOKEN"

# Create envelope
curl -X POST http://localhost:3000/envelopes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Groceries","amount_type":"FIXED","amount":500,"refresh_type":"REFRESH"}'

# Update envelope
curl -X PUT http://localhost:3000/envelopes/ENVELOPE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":600}'

# Delete envelope
curl -X DELETE http://localhost:3000/envelopes/ENVELOPE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Transactions (requires TOKEN)
```bash
# List transactions
curl http://localhost:3000/transactions \
  -H "Authorization: Bearer $TOKEN"

# List uncategorized
curl "http://localhost:3000/transactions?uncategorized=true" \
  -H "Authorization: Bearer $TOKEN"

# Create manual transaction
curl -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":45.67,"type":"EXPENSE","datetime":"2025-12-03T18:00:00Z","description":"Lunch","merchant_name":"Restaurant","envelope_id":"ENVELOPE_ID"}'

# Categorize transaction
curl -X PUT http://localhost:3000/transactions/TX_ID/categorize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"envelope_id":"ENVELOPE_ID","apply_rule":true}'
```

### Plaid Integration (requires TOKEN)
```bash
# Get Link token
curl -X POST http://localhost:3000/plaid/link-token \
  -H "Authorization: Bearer $TOKEN"

# Exchange public token (after Plaid Link)
curl -X POST http://localhost:3000/plaid/exchange-token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"public_token":"public-sandbox-..."}'

# Sync transactions
curl -X POST http://localhost:3000/plaid/sync \
  -H "Authorization: Bearer $TOKEN"
```

## Testing Workflow

1. **Health Check**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Register User**
   ```bash
   curl -X POST http://localhost:3000/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'
   ```

3. **Verify Email** (via AWS CLI or Console)
   ```bash
   aws cognito-idp admin-confirm-sign-up \
     --user-pool-id $COGNITO_USER_POOL_ID \
     --username test@example.com
   ```

4. **Login & Get Token**
   ```bash
   curl -X POST http://localhost:3000/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test123!"}'
   ```
   Copy the `accessToken` from response.

5. **Create Envelope**
   ```bash
   TOKEN="paste-token-here"
   curl -X POST http://localhost:3000/envelopes \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Groceries","amount_type":"FIXED","amount":500,"refresh_type":"REFRESH"}'
   ```
   Copy the envelope `id` from response.

6. **Create Transaction**
   ```bash
   ENVELOPE_ID="paste-envelope-id-here"
   curl -X POST http://localhost:3000/transactions \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d "{\"amount\":45.67,\"type\":\"EXPENSE\",\"datetime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"description\":\"Groceries\",\"merchant_name\":\"Store\",\"envelope_id\":\"$ENVELOPE_ID\"}"
   ```

7. **View Envelopes with Balance**
   ```bash
   curl http://localhost:3000/envelopes \
     -H "Authorization: Bearer $TOKEN"
   ```

## Automated Testing

Run the full test suite:
```bash
cd backend
./test-endpoints.sh
```

This will automatically:
- Register a new user
- Prompt you to verify email
- Login and get token
- Test all CRUD operations
- Create envelopes, transactions, rules
- Test categorization and reallocation

## Common Issues

**"User is not confirmed"**
- Need to verify email via Cognito
- Run: `aws cognito-idp admin-confirm-sign-up --user-pool-id $COGNITO_USER_POOL_ID --username EMAIL`

**"Access token required"**
- Missing Authorization header
- Add: `-H "Authorization: Bearer $TOKEN"`

**"Invalid or expired token"**
- Token expired (7 day lifetime for Cognito)
- Login again to get new token

**Network connectivity errors**
- Check Aurora DSQL endpoint is accessible
- Verify AWS credentials and region are correct
- Check security groups allow connections

## File Reference

- `API_DOCUMENTATION.md` - Complete API reference
- `IMPLEMENTATION_SUMMARY.md` - Technical implementation details
- `test-endpoints.sh` - Automated test script
- `server.js` - Main application entry point
