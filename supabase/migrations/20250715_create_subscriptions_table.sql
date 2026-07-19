-- Migration: Create subscriptions table for Mercado Pago billing integration
-- Run this SQL in the Supabase SQL Editor (project does not use Supabase CLI locally)

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
