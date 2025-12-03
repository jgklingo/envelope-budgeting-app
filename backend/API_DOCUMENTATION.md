# Envelope Budgeting App - API Documentation

Base URL: `http://localhost:3000`

## Authentication Endpoints

### Register User
**POST** `/register`

Creates a new user account using AWS Cognito.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response:** `201 Created`
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "message": "User registered successfully. Please check your email for verification code."
}
```

**Notes:**
- Password must meet Cognito requirements (8+ chars, uppercase, lowercase, number, special char)
- User will receive verification email from Cognito
- User must verify email before logging in

---

### Login
**POST** `/login`

Authenticates user and returns Cognito tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "cognito-access-token",
  "idToken": "cognito-id-token",
  "refreshToken": "cognito-refresh-token",
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Notes:**
- Use `accessToken` for all subsequent API calls
- Include as `Authorization: Bearer <accessToken>` header

---

## Envelope Endpoints

All envelope endpoints require authentication.

### Get All Envelopes
**GET** `/envelopes`

Returns all envelopes for the authenticated user with current balance.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Groceries",
    "amount_type": "FIXED",
    "amount": "500.00",
    "refresh_type": "REFRESH",
    "current_balance": "454.33",
    "created_at": "2025-12-03T18:00:00.000Z",
    "updated_at": "2025-12-03T18:00:00.000Z"
  }
]
```

**Notes:**
- `amount_type`: FIXED, PERCENTAGE_CURRENT, PERCENTAGE_PREVIOUS
- `refresh_type`: REFRESH or ROLLOVER
- `current_balance`: Calculated from transactions (income - expenses)

---

### Create Envelope
**POST** `/envelopes`

Creates a new budget envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
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
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Groceries",
  "amount_type": "FIXED",
  "amount": "500.00",
  "refresh_type": "REFRESH",
  "created_at": "2025-12-03T18:00:00.000Z",
  "updated_at": "2025-12-03T18:00:00.000Z"
}
```

---

### Update Envelope
**PUT** `/envelopes/:id`

Updates an existing envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:** (all fields optional)
```json
{
  "name": "Groceries & Dining",
  "amount": 600.00
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Groceries & Dining",
  "amount": "600.00",
  ...
}
```

---

### Delete Envelope
**DELETE** `/envelopes/:id`

Deletes an envelope and uncategorizes its transactions.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "message": "Envelope deleted successfully"
}
```

---

### Get Envelope Rules
**GET** `/envelopes/:id/rules`

Returns categorization rules for an envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "envelope_id": "uuid",
    "plaid_category": "FOOD_AND_DRINK",
    "merchant_pattern": "Whole Foods",
    "created_at": "2025-12-03T18:00:00.000Z"
  }
]
```

---

### Add Envelope Rule
**POST** `/envelopes/:id/rules`

Adds a categorization rule to an envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "plaid_category": "FOOD_AND_DRINK",
  "merchant_pattern": "Walmart"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "envelope_id": "uuid",
  "plaid_category": "FOOD_AND_DRINK",
  "merchant_pattern": "Walmart",
  "created_at": "2025-12-03T18:00:00.000Z"
}
```

---

## Transaction Endpoints

### Get Transactions
**GET** `/transactions`

Returns transactions for the authenticated user.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `envelope_id`: Filter by envelope (optional)
- `uncategorized`: Set to "true" to show only uncategorized (optional)
- `start_date`: Filter by start date (optional, ISO format)
- `end_date`: Filter by end date (optional, ISO format)

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "envelope_id": "uuid",
    "envelope_name": "Groceries",
    "plaid_transaction_id": "plaid_id",
    "datetime": "2025-12-03T18:00:00.000Z",
    "amount": "45.67",
    "type": "EXPENSE",
    "description": "Grocery shopping",
    "merchant_name": "Whole Foods",
    "plaid_category": "FOOD_AND_DRINK",
    "is_categorized": true,
    "categorization_source": "AUTO",
    "created_at": "2025-12-03T18:00:00.000Z"
  }
]
```

**Notes:**
- `type`: INCOME or EXPENSE
- `categorization_source`: AUTO (rule-based), MANUAL (user-assigned), or null

---

### Create Transaction (Manual Entry)
**POST** `/transactions`

Manually creates a transaction.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "amount": 45.67,
  "type": "EXPENSE",
  "datetime": "2025-12-03T18:00:00.000Z",
  "description": "Grocery shopping",
  "merchant_name": "Whole Foods",
  "envelope_id": "uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "envelope_id": "uuid",
  "datetime": "2025-12-03T18:00:00.000Z",
  "amount": "45.67",
  "type": "EXPENSE",
  ...
}
```

---

### Categorize Transaction
**PUT** `/transactions/:id/categorize`

Assigns a transaction to an envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "envelope_id": "uuid",
  "apply_rule": true
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "envelope_id": "uuid",
  "is_categorized": true,
  "categorization_source": "MANUAL",
  ...
}
```

**Notes:**
- `apply_rule`: If true, creates a rule to auto-categorize similar future transactions

---

### Reallocate Income Transaction
**POST** `/transactions/:id/reallocate`

Moves an income transaction to a different envelope.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "envelope_id": "uuid"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "envelope_id": "uuid",
  ...
}
```

**Notes:**
- Only works for INCOME type transactions
- Used to redistribute income allocation across envelopes

---

## Plaid Integration Endpoints

### Create Link Token
**POST** `/plaid/link-token`

Generates a Plaid Link token for bank account connection.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "link_token": "link-sandbox-..."
}
```

**Notes:**
- Use this token with Plaid Link SDK in frontend
- Token expires after 4 hours

---

### Exchange Public Token
**POST** `/plaid/exchange-token`

Exchanges Plaid public token for access token after successful Link.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "public_token": "public-sandbox-..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Bank account linked successfully"
}
```

---

### Sync Transactions
**POST** `/plaid/sync`

Syncs transactions from Plaid (pulls new/modified/deleted transactions).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response:** `200 OK`
```json
{
  "message": "Transactions synced successfully",
  "added": 15,
  "modified": 2,
  "removed": 0
}
```

**Notes:**
- Automatically categorizes transactions based on envelope rules
- Filters out pending and transfer transactions
- Should be called daily or on-demand

---

## Health Check

### Health
**GET** `/health`

Returns API health status.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T18:00:00.000Z"
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request**
```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized**
```json
{
  "error": "Access token required"
}
```

**403 Forbidden**
```json
{
  "error": "Invalid or expired token"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Operation failed"
}
```
