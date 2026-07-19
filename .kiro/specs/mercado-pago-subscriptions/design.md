# Design Document

## Overview

This design implements Mercado Pago transparent checkout for subscription billing in BoraGerir Conversas. The architecture follows the existing Next.js 14 App Router patterns, using server-side API routes for Mercado Pago API communication and the official MercadoPago.js SDK for secure client-side card tokenization.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Billing Page)                                     │
│  ┌─────────────────┐  ┌──────────────────────────────────┐ │
│  │ Plan Selection   │  │ MercadoPago SDK (CardPayment)    │ │
│  │ Component        │  │ - Card Number                     │ │
│  │                  │  │ - Expiry / CVV                    │ │
│  │                  │  │ - Cardholder Name                 │ │
│  │                  │  │ - Document (CPF)                  │ │
│  └────────┬─────────┘  └──────────────┬───────────────────┘ │
│           │                            │ (card token)        │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend API Routes (Next.js)                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ /api/billing/subscribe     POST  - Create subscription  ││
│  │ /api/billing/change-plan   POST  - Upgrade/Downgrade    ││
│  │ /api/billing/cancel        POST  - Cancel subscription  ││
│  │ /api/billing/reactivate    POST  - Reactivate sub       ││
│  │ /api/billing/invoices      GET   - Payment history      ││
│  │ /api/webhooks/mercadopago  POST  - Webhook receiver     ││
│  └─────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  External Services                                            │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Mercado Pago API │  │ Supabase (PostgreSQL)            │ │
│  │ - Subscriptions  │  │ - subscriptions table            │ │
│  │ - Payments       │  │ - invoices table                 │ │
│  │ - Webhooks       │  │ - companies table (existing)     │ │
│  └──────────────────┘  │ - plans table (existing)         │ │
│                         └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Subscription Creation Flow:**
   - User selects plan → Card form renders via MercadoPago SDK
   - SDK tokenizes card client-side (PCI compliant) → sends token to `/api/billing/subscribe`
   - Backend creates customer in MP → creates subscription → stores records in Supabase
   - Returns success → frontend updates company context

2. **Webhook Processing Flow:**
   - Mercado Pago sends notification to `/api/webhooks/mercadopago`
   - Handler validates signature → fetches payment details from MP API
   - Updates invoice status → updates subscription/company status as needed
   - Returns 200 immediately

3. **Plan Change Flow:**
   - User selects new plan → sees price difference/proration
   - Confirms → backend updates subscription amount in MP
   - Upgrade: immediate effect + prorated charge
   - Downgrade: scheduled for end of period

## Database Schema

### New Table: `subscriptions`

```sql
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  mp_subscription_id TEXT UNIQUE NOT NULL,
  mp_payer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_cancellation', 'cancelled', 'suspended')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  card_last_four TEXT,
  card_brand TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancellation_effective_date TIMESTAMPTZ,
  scheduled_plan_id UUID REFERENCES plans(id),
  consecutive_failures INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_mp_id ON subscriptions(mp_subscription_id);
```

### New Table: `invoices`

```sql
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mp_payment_id TEXT UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  card_last_four TEXT,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_mp_payment ON invoices(mp_payment_id);
```

## API Design

### POST `/api/billing/subscribe`

**Request:**
```json
{
  "plan_id": "uuid",
  "billing_cycle": "monthly" | "yearly",
  "token": "card_token_from_sdk",
  "payer": {
    "email": "user@email.com",
    "identification": { "type": "CPF", "number": "12345678900" }
  }
}
```

**Response (201):**
```json
{
  "subscription_id": "uuid",
  "mp_subscription_id": "mp_xxx",
  "status": "active",
  "current_period_end": "2025-08-15T00:00:00Z"
}
```

### POST `/api/billing/change-plan`

**Request:**
```json
{
  "new_plan_id": "uuid",
  "billing_cycle": "monthly" | "yearly"
}
```

**Response (200):**
```json
{
  "type": "upgrade" | "downgrade",
  "effective_date": "2025-07-15T00:00:00Z",
  "prorated_amount": 150.00,
  "new_plan": { "name": "Pro", "price_monthly": 597 }
}
```

### POST `/api/billing/cancel`

**Response (200):**
```json
{
  "status": "pending_cancellation",
  "effective_date": "2025-08-15T00:00:00Z"
}
```

### POST `/api/billing/reactivate`

**Response (200):**
```json
{
  "status": "active",
  "current_period_end": "2025-08-15T00:00:00Z"
}
```

### GET `/api/billing/invoices?status=all&page=1&limit=10`

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "amount": 297.00,
      "status": "approved",
      "billing_period_start": "2025-06-15",
      "billing_period_end": "2025-07-15",
      "card_last_four": "4242",
      "paid_at": "2025-06-15T10:00:00Z"
    }
  ],
  "total": 5,
  "page": 1
}
```

### POST `/api/webhooks/mercadopago`

Receives Mercado Pago IPN notifications. Validates `x-signature` header. Handles:
- `payment` topic: updates invoice status, handles consecutive failures
- `subscription_preapproval` topic: handles subscription lifecycle events

## Frontend Components

### File Structure

```
app/(dashboard)/settings/billing/
├── page.tsx                    (main billing page - refactored)
├── components/
│   ├── plan-selector.tsx       (plan cards with pricing)
│   ├── payment-form.tsx        (MercadoPago SDK card form wrapper)
│   ├── subscription-status.tsx (current plan + status display)
│   ├── payment-history.tsx     (invoices table)
│   ├── cancel-dialog.tsx       (cancellation confirmation)
│   └── downgrade-warning.tsx   (limit exceeded warning)
```

### MercadoPago SDK Integration

The frontend uses `@mercadopago/sdk-react` package which provides:
- `initMercadoPago(publicKey)` — initializes the SDK
- `CardPayment` component — renders secure card fields
- Automatic token generation on form submit

```tsx
// Simplified usage pattern
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react'

initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!)

<CardPayment
  initialization={{ amount: plan.price_monthly }}
  onSubmit={async (formData) => {
    // formData contains token, payment_method_id, issuer_id, etc.
    await fetch('/api/billing/subscribe', {
      method: 'POST',
      body: JSON.stringify({ ...formData, plan_id, billing_cycle })
    })
  }}
  locale="pt-BR"
/>
```

## Backend Implementation

### Mercado Pago SDK (Server-Side)

Uses the official `mercadopago` Node.js SDK for backend API calls:

```typescript
// lib/mercadopago.ts
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!
})

export const preApproval = new PreApproval(client)
export const payment = new Payment(client)
```

### Subscription Creation Logic

1. Validate user session and plan existence
2. Create or retrieve MP customer (payer)
3. Create `preapproval` (subscription) in Mercado Pago with:
   - `reason`: Plan name
   - `auto_recurring.frequency`: 1
   - `auto_recurring.frequency_type`: "months" or "days" (365 for yearly)
   - `auto_recurring.transaction_amount`: plan price
   - `card_token_id`: from frontend SDK
   - `payer_email`: user email
4. Store subscription record in Supabase
5. Update company `plan_id` and `plan_status`

### Webhook Signature Validation

```typescript
import crypto from 'crypto'

function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  const parts = xSignature.split(',')
  const ts = parts.find(p => p.trim().startsWith('ts='))?.split('=')[1]
  const hash = parts.find(p => p.trim().startsWith('v1='))?.split('=')[1]
  
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const computed = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')
  
  return computed === hash
}
```

## Environment Variables

```env
# Client-side (NEXT_PUBLIC_)
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxxxxxx

# Server-side only
MP_ACCESS_TOKEN=APP_USR-xxxxxxxx
MP_WEBHOOK_SECRET=xxxxxxxx
```

## Dependencies to Add

```json
{
  "@mercadopago/sdk-react": "^0.0.19",
  "mercadopago": "^2.0.15"
}
```

## Security Considerations

1. **PCI Compliance**: Card data never touches our servers — MercadoPago SDK handles tokenization client-side
2. **Webhook Validation**: Every webhook verified via HMAC-SHA256 signature before processing
3. **Idempotency**: Webhook handler checks `mp_payment_id` uniqueness before creating records
4. **Access Control**: All billing endpoints verify session + company membership with admin/owner role
5. **Environment Isolation**: Access token only in server-side env vars, public key in `NEXT_PUBLIC_`

## Error Handling Strategy

- **Network failures to MP API**: Return 503 with retry guidance to frontend
- **Invalid card token**: Return specific validation error from MP to show user
- **Webhook processing errors**: Log error, return 200 (prevent MP from retrying), queue for manual review
- **Concurrent webhook delivery**: Use `mp_payment_id` unique constraint as idempotency guard
- **Subscription state conflicts**: Always fetch latest state from MP API before making changes
