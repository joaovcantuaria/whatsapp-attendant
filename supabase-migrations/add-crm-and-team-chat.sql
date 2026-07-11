-- Adicionar colunas CRM na tabela de contatos
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS crm_stage TEXT DEFAULT 'initial';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS crm_company TEXT;

-- Criar tabela de mensagens do chat interno
CREATE TABLE IF NOT EXISTS team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_messages_company ON team_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created ON team_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_crm_stage ON contacts(crm_stage);

-- RLS
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Politica de acesso: membros da empresa podem ver mensagens da equipe
CREATE POLICY "Members can view team messages" ON team_messages
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Members can insert team messages" ON team_messages
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
