-- Tabela de cupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
  max_uses INTEGER NOT NULL DEFAULT 100,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tickets de suporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de soluções/funcionalidades do sistema
CREATE TABLE IF NOT EXISTS solutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'development', 'planned')),
  category TEXT NOT NULL DEFAULT 'Geral',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir soluções padrão
INSERT INTO solutions (title, description, status, category) VALUES
  ('Agente IA', 'Automatização de primeiro atendimento com inteligência artificial', 'active', 'Automação'),
  ('CRM Pipeline', 'Gestão visual de leads com pipeline kanban', 'active', 'Vendas'),
  ('Campanhas em Massa', 'Disparo de mensagens segmentadas para base de contatos', 'active', 'Marketing'),
  ('Chat Interno', 'Comunicação entre atendentes na plataforma', 'active', 'Comunicação'),
  ('Webhooks & API', 'Integrações externas via webhooks e API REST', 'active', 'Integração'),
  ('Chatbot Flow Builder', 'Editor visual de fluxos de chatbot', 'development', 'Automação'),
  ('Relatórios Avançados', 'Dashboards customizáveis com métricas detalhadas', 'planned', 'Analytics')
ON CONFLICT DO NOTHING;

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);

-- RLS (desabilitado para service_role que é o que o admin usa)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (admin)
CREATE POLICY "Service role full access on coupons" ON coupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on support_tickets" ON support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on solutions" ON solutions FOR ALL USING (true) WITH CHECK (true);
