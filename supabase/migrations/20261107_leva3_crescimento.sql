-- ============================================================
-- Leva 3 — automações com o Bora Gerir App e links de entrada
-- Rodar ANTES de publicar o código desta leva (depois das Levas 1 e 2).
-- ============================================================

-- 1) Automações (uma de cada tipo por empresa)
CREATE TABLE IF NOT EXISTS automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('aniversario', 'reativacao', 'lembrete_agendamento')),
  is_active BOOLEAN DEFAULT false,
  template_name TEXT,
  template_language TEXT DEFAULT 'pt_BR',
  vars TEXT[] DEFAULT '{}',               -- o que vai em {{1}}, {{2}}...: nome, cupom, desconto, validade, empresa, servico, data, hora...
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_on DATE,                        -- automações diárias: último dia processado por completo
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, type)
);

-- Cada envio (ou pulo) fica registrado; a chave única impede mandar duas vezes a mesma coisa
CREATE TABLE IF NOT EXISTS automation_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  contact_name TEXT,
  reference TEXT NOT NULL,                 -- aniversário: ano | reativação: data da última visita | lembrete: id do agendamento
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (automation_id, phone, reference)
);
CREATE INDEX IF NOT EXISTS idx_automation_sends_recentes ON automation_sends(company_id, created_at DESC);

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_sends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "automations_select_membros" ON automations;
CREATE POLICY "automations_select_membros" ON automations FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));
DROP POLICY IF EXISTS "automation_sends_select_membros" ON automation_sends;
CREATE POLICY "automation_sends_select_membros" ON automation_sends FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));

-- 2) Links e QR Codes de entrada (wa.me com código): identificam de onde o cliente veio
CREATE TABLE IF NOT EXISTS entry_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- ex.: Instagram, Panfleto da loja
  code TEXT NOT NULL,                      -- vai no fim da mensagem: #INSTA7
  phone TEXT NOT NULL,                     -- número do WhatsApp que recebe (só dígitos)
  message TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  tag TEXT,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, code)
);
ALTER TABLE entry_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entry_links_select_membros" ON entry_links;
CREATE POLICY "entry_links_select_membros" ON entry_links FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS entry_link_id UUID REFERENCES entry_links(id) ON DELETE SET NULL;
