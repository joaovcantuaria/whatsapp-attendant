export type BillingCycle = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'pending_cancellation' | 'cancelled' | 'suspended'
export type InvoiceStatus = 'approved' | 'pending' | 'rejected'

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  mp_subscription_id: string
  mp_payer_id: string | null
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  card_last_four: string | null
  card_brand: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancellation_effective_date: string | null
  scheduled_plan_id: string | null
  consecutive_failures: number
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  subscription_id: string
  company_id: string
  mp_payment_id: string | null
  amount: number
  currency: string
  status: InvoiceStatus
  billing_period_start: string | null
  billing_period_end: string | null
  card_last_four: string | null
  failure_reason: string | null
  paid_at: string | null
  created_at: string
}

// API Request/Response types
export interface SubscribeRequest {
  plan_id: string
  billing_cycle: BillingCycle
  token: string
  payer: {
    email: string
    identification: {
      type: string
      number: string
    }
  }
}

export interface SubscribeResponse {
  subscription_id: string
  mp_subscription_id: string
  status: SubscriptionStatus
  current_period_end: string
}

export interface ChangePlanRequest {
  new_plan_id: string
  billing_cycle: BillingCycle
}

export interface ChangePlanResponse {
  type: 'upgrade' | 'downgrade'
  effective_date: string
  prorated_amount: number | null
  new_plan: {
    name: string
    price_monthly: number
  }
}

export interface CancelResponse {
  status: 'pending_cancellation'
  effective_date: string
}

export interface ReactivateResponse {
  status: 'active'
  current_period_end: string
}

export interface InvoicesResponse {
  invoices: Invoice[]
  total: number
  page: number
}
