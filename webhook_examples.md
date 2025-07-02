# Webhook Examples

## Registration Webhook

### Create a new registration with request_id

```bash
curl -X POST https://hkdk.events/YOUR_SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "contact": "+351912345678",
    "camp_id": "your-camp-id",
    "request_id": "req_abc123def456"
  }'
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Webhook received and processed successfully",
  "request_id": "req_abc123def456"
}
```

## Payment Webhook

### Create a payment using request_id

```bash
curl -X POST https://hkdk.events/YOUR_PAYMENT_SOURCE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "req_abc123def456",
    "amount": 150.00,
    "status": "paid"
  }'
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Webhook received and processed successfully",
  "request_id": "req_xyz789ghi012"
}
```

## How it works

1. **Registration Creation**: When you create a registration via webhook, include a `request_id` in the payload
2. **Database Storage**: The `request_id` is stored in the `registrations` table
3. **Payment Association**: When creating a payment, you can reference the registration using the same `request_id`
4. **Automatic Linking**: The system automatically finds the registration by `request_id` and associates the payment

## Alternative Payment Methods

You can also create payments using:
- `registration_id`: Direct registration ID
- `email`: Registration email (finds the most recent registration)

The priority order is:
1. `registration_id`
2. `request_id` 
3. `email` 