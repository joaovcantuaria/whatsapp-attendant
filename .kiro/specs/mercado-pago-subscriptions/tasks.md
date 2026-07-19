# Tasks

## Task 1: Database Schema & Environment Setup

- [x] 1.1 Create Supabase migration for `subscriptions` table with all columns (id, company_id, plan_id, mp_subscription_id, mp_payer_id, status, billing_cycle, card_last_four, card_brand, current_period_start, current_period_end, cancellation_effective_date, scheduled_plan_id, consecutive_failures, created_at, updated_at), indexes, and foreign keys
- [x] 1.2 Create Supabase migration for `invoices` table with all columns (id, subscription_id, company_id, mp_payment_id, amount, currency, status, billing_period_start, billing_period_end, card_last_four, failure_reason, paid_at, created_at), indexes, and foreign keys
- [x] 1.3 Add environment variables to `.env.local`: `NEXT_PUBLIC_MP_PUBLIC_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`
- [x] 1.4 Install dependencies: `@mercadopago/sdk-react` and `mercadopago`
- [x] 1.5 Create `lib/mercadopago.ts` with server-side MercadoPago client configuration using `MercadoPagoConfig`, `PreApproval`, and `Payment` exports
- [x] 1.6 Create TypeScript types in `types/billing.ts` for Subscription, Invoice, BillingCycle, SubscriptionStatus, and API request/response interfaces

## Task 2: Subscription Creation API & Card Tokenization

- [x] 2.1 Create `app/api/billing/subscribe/route.ts` POST handler that: validates session + admin/owner role, validates plan exists and is active, creates preapproval in Mercado Pago with card token, stores subscription record in Supabase, updates company plan_id and plan_status to "active"
- [x] 2.2 Create `app/api/billing/subscription/route.ts` GET handler that returns the current company's active subscription details including plan info and next billing date
- [x] 2.3 Add error handling for MP API rejections with mapped Portuguese error messages (cc_rejected_bad_filled_card_number, cc_rejected_insufficient_amount, etc.)
- [x] 2.4 Add validation using Zod for subscribe request body (plan_id UUID, billing_cycle enum, token string, payer object with email and identification)

## Task 3: Webhook Handler

- [x] 3.1 Create `app/api/webhooks/mercadopago/route.ts` POST handler with signature validation using x-signature header and MP_WEBHOOK_SECRET
- [x] 3.2 Implement `payment.approved` webhook handling: fetch payment details from MP API, create/update invoice as "approved", set paid_at, confirm company plan_status as "active", reset consecutive_failures to 0
- [x] 3.3 Implement `payment.pending` webhook handling: create/update invoice as "pending"
- [x] 3.4 Implement `payment.rejected` webhook handling: create/update invoice as "rejected", store failure_reason, increment consecutive_failures, suspend company if failures >= 3
- [x] 3.5 Implement subscription cancellation webhook: update subscription status to "cancelled", update company plan_status to "cancelled"
- [x] 3.6 Add idempotency guard using mp_payment_id unique constraint — skip processing if payment already recorded with same status
- [x] 3.7 Ensure handler returns 200 within response (no heavy processing after response), log errors for manual review

## Task 4: Frontend Payment Form (Transparent Checkout)

- [x] 4.1 Create `app/(dashboard)/settings/billing/components/payment-form.tsx` component that initializes MercadoPago SDK with NEXT_PUBLIC_MP_PUBLIC_KEY and renders CardPayment component with locale="pt-BR"
- [x] 4.2 Handle CardPayment onSubmit callback: extract token and payment method data, call /api/billing/subscribe, show loading state during processing
- [x] 4.3 Handle card tokenization errors: display specific validation messages in Portuguese (número inválido, data expirada, CVV incorreto)
- [x] 4.4 Handle API rejection responses: map MP rejection codes to user-friendly Portuguese messages and display in toast/alert
- [x] 4.5 Add loading skeleton while MercadoPago SDK initializes, and error state with retry button if SDK fails to load
- [x] 4.6 Create billing cycle toggle (Mensal/Anual) with price display showing yearly discount

## Task 5: Plan Selection & Upgrade/Downgrade

- [x] 5.1 Create `app/(dashboard)/settings/billing/components/plan-selector.tsx` that fetches active plans from API and displays them as cards with pricing, features, and current plan indicator
- [x] 5.2 Create `app/api/billing/change-plan/route.ts` POST handler that determines if change is upgrade or downgrade, calculates proration for upgrades, schedules downgrades for end of period
- [x] 5.3 Implement upgrade logic: update MP subscription amount immediately, charge prorated difference, update company plan_id, create invoice for prorated amount
- [x] 5.4 Implement downgrade logic: store scheduled_plan_id on subscription record, create webhook/cron to apply at period end, show scheduled change in UI
- [x] 5.5 Create `app/(dashboard)/settings/billing/components/downgrade-warning.tsx` that checks current usage against new plan limits and displays warnings for limits that would be exceeded
- [x] 5.6 Show price difference preview when user selects a different plan (prorated amount for upgrade, future price for downgrade)

## Task 6: Trial-to-Paid Conversion

- [x] 6.1 Refactor `app/(dashboard)/settings/billing/page.tsx` to show prominent "Ativar Plano" CTA when plan_status is "trial", displaying remaining trial days from useCompany hook
- [x] 6.2 When trial user submits payment, ensure subscribe endpoint handles transition from trial → active (no existing subscription to cancel)
- [x] 6.3 Handle trial expiration: update suspended state display in billing page with reactivation form (same payment form + plan selection)
- [x] 6.4 Create `app/(dashboard)/settings/billing/components/subscription-status.tsx` that displays current subscription state, next billing date, card on file (last 4 digits + brand), and status badges

## Task 7: Payment History & Invoices

- [x] 7.1 Create `app/api/billing/invoices/route.ts` GET handler with pagination (page, limit) and status filter, returning invoices for the authenticated company
- [x] 7.2 Create `app/(dashboard)/settings/billing/components/payment-history.tsx` component with table displaying date, amount, status badge (aprovado/pendente/rejeitado), billing period, card info
- [x] 7.3 Add status filter tabs (Todas, Aprovadas, Pendentes, Rejeitadas) to payment history
- [x] 7.4 Add invoice detail view (expandable row or modal) showing MP payment ID, full payment method info, and status timeline
- [x] 7.5 Handle empty state: display "Nenhuma fatura encontrada" message when no invoices exist

## Task 8: Cancellation & Reactivation

- [x] 8.1 Create `app/(dashboard)/settings/billing/components/cancel-dialog.tsx` with AlertDialog explaining access continues until period end, showing effective cancellation date
- [x] 8.2 Create `app/api/billing/cancel/route.ts` POST handler that cancels subscription in MP API, updates subscription status to "pending_cancellation", stores cancellation_effective_date
- [x] 8.3 Create `app/api/billing/reactivate/route.ts` POST handler that reactivates subscription in MP API (before effective date), updates status back to "active", clears cancellation fields
- [x] 8.4 Update billing page to show pending cancellation state: display effective date, "Reativar" button, and visual indicator that subscription is ending
- [x] 8.5 Handle cancellation effective date reached: webhook or scheduled check updates company plan_status to "cancelled"

## Task 9: Billing Page Integration & Polish

- [x] 9.1 Refactor `app/(dashboard)/settings/billing/page.tsx` to compose all new components: SubscriptionStatus, PlanSelector, PaymentForm, PaymentHistory, CancelDialog — conditionally rendered based on subscription state
- [x] 9.2 Add role-based access control: only show billing management to users with "admin" or "owner" role (from company_members), show read-only view to other roles
- [x] 9.3 Update `useCompany` hook to include subscription data (next billing date, cancellation status) for use across the app
- [x] 9.4 Add toast notifications for all billing actions: subscription created, plan changed, payment failed, subscription cancelled, subscription reactivated
- [x] 9.5 Test complete flow: trial → subscribe → view invoice → upgrade → downgrade schedule → cancel → reactivate
- [x] 9.6 Add Vercel environment variables documentation noting which vars need to be set in Vercel dashboard (NEXT_PUBLIC_MP_PUBLIC_KEY, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET)
