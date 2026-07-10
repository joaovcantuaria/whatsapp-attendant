-- ============================================
-- MULTI-TENANT SCHEMA - WhatsApp Attendant SaaS
-- Execute APÓS o schema.sql original
-- ============================================

-- Planos disponíveis
create table if not exists plans (
  id uuid default gen_random_uuid() primary key,
  name varchar(100) not null,
  slug varchar(50) not null unique,
  description text,
  price_monthly decimal(10,2) not null,
  max_agents int not null default 3,
  max_conversations_per_month int,
  features jsonb,
  is_active boolean default true,
  created_at timestamp default now()
);

-- Empresas (tenants)
create table if not exists companies (
  id uuid default gen_random_uuid() primary key,
  name varchar(150) not null,
  slug varchar(100) not null unique,
  email varchar(150) not null unique,
  phone varchar(20),
  document varchar(20),
  logo_url text,
  plan_id uuid references plans(id),
  plan_status varchar(20) default 'trial',
  trial_ends_at timestamp default (now() + interval '14 days'),
  subscription_id varchar(100),
  whatsapp_token text,
  whatsapp_phone_number_id varchar(100),
  whatsapp_business_account_id varchar(100),
  whatsapp_connected boolean default false,
  webhook_url text,
  welcome_message text,
  away_message text,
  business_hours jsonb,
  away_message_enabled boolean default false,
  welcome_message_enabled boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Membros da empresa
create table if not exists company_members (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  user_id uuid references auth.users(id) not null,
  role varchar(20) default 'agent',
  is_active boolean default true,
  invited_by uuid references auth.users(id),
  invited_at timestamp default now(),
  joined_at timestamp,
  unique(company_id, user_id)
);

-- Convites pendentes
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  email varchar(150) not null,
  role varchar(20) default 'agent',
  token varchar(100) not null unique,
  invited_by uuid references auth.users(id),
  expires_at timestamp default (now() + interval '7 days'),
  accepted_at timestamp,
  created_at timestamp default now()
);

-- Uso mensal por empresa
create table if not exists usage_logs (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) not null,
  month varchar(7) not null,
  conversations_count int default 0,
  messages_sent int default 0,
  messages_received int default 0,
  unique(company_id, month)
);

-- Adicionar company_id em tabelas existentes (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='company_id') THEN
    ALTER TABLE contacts ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversations' AND column_name='company_id') THEN
    ALTER TABLE conversations ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='company_id') THEN
    ALTER TABLE messages ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='message_templates' AND column_name='company_id') THEN
    ALTER TABLE message_templates ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quick_replies' AND column_name='company_id') THEN
    ALTER TABLE quick_replies ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='conversation_notes' AND column_name='company_id') THEN
    ALTER TABLE conversation_notes ADD COLUMN company_id uuid references companies(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tags' AND column_name='company_id') THEN
    ALTER TABLE tags ADD COLUMN company_id uuid references companies(id);
  END IF;
END $$;

-- Índices
create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_conversations_company on conversations(company_id);
create index if not exists idx_messages_company on messages(company_id);
create index if not exists idx_conversations_company_status on conversations(company_id, status);
create index if not exists idx_company_members_user on company_members(user_id);
create index if not exists idx_company_members_company on company_members(company_id);

-- Inserir planos padrão
INSERT INTO plans (name, slug, description, price_monthly, max_agents, max_conversations_per_month, features)
VALUES
  ('Starter', 'starter', 'Ideal para pequenas empresas', 297.00, 2, 500, '{"quick_replies": true, "templates": true, "reports": false, "api_access": false}'),
  ('Pro', 'pro', 'Para empresas em crescimento', 597.00, 5, 2000, '{"quick_replies": true, "templates": true, "reports": true, "api_access": false}'),
  ('Business', 'business', 'Para equipes maiores', 997.00, 15, 10000, '{"quick_replies": true, "templates": true, "reports": true, "api_access": true}')
ON CONFLICT (slug) DO NOTHING;

-- Função para obter company_id do usuário logado
create or replace function get_user_company_id()
returns uuid as $$
  select company_id from company_members
  where user_id = auth.uid() and is_active = true
  limit 1;
$$ language sql security definer;

-- Recriar policies com isolamento por empresa
drop policy if exists "Authenticated agents access" on contacts;
drop policy if exists "Authenticated agents access" on conversations;
drop policy if exists "Authenticated agents access" on messages;
drop policy if exists "Authenticated agents access" on message_templates;
drop policy if exists "Authenticated agents access" on quick_replies;
drop policy if exists "Authenticated agents access" on conversation_notes;
drop policy if exists "Authenticated agents access" on agents;
drop policy if exists "Authenticated agents access" on tags;

create policy "Company isolation" on contacts for all using (company_id = get_user_company_id());
create policy "Company isolation" on conversations for all using (company_id = get_user_company_id());
create policy "Company isolation" on messages for all using (company_id = get_user_company_id());
create policy "Company isolation" on message_templates for all using (company_id = get_user_company_id());
create policy "Company isolation" on quick_replies for all using (company_id = get_user_company_id());
create policy "Company isolation" on conversation_notes for all using (company_id = get_user_company_id());
create policy "Company isolation" on tags for all using (company_id = get_user_company_id());

-- Companies RLS
alter table companies enable row level security;
create policy "Members see own company" on companies for select
  using (id = get_user_company_id());
create policy "Owner can update company" on companies for update
  using (id = get_user_company_id());

-- Company members RLS
alter table company_members enable row level security;
create policy "See own company members" on company_members for select
  using (company_id = get_user_company_id());

-- Plans são públicos para leitura
alter table plans enable row level security;
create policy "Anyone can read plans" on plans for select using (true);

-- Invitations
alter table invitations enable row level security;
create policy "Company members manage invitations" on invitations for all
  using (company_id = get_user_company_id());

-- Usage logs
alter table usage_logs enable row level security;
create policy "Company isolation" on usage_logs for all
  using (company_id = get_user_company_id());

-- Realtime para company_members
alter publication supabase_realtime add table company_members;
