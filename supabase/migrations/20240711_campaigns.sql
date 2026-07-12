-- Tabela de Campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'pt_BR',
  template_components JSONB,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, running, completed, cancelled
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  contact_filter JSONB, -- { tags: [], search: '' }
  contact_ids UUID[], -- IDs específicos selecionados
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Mensagens de Campanha (log individual)
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_id ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_whatsapp_id ON campaign_messages(whatsapp_message_id);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- Policies (company-scoped access)
CREATE POLICY "campaigns_company_access" ON campaigns
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "campaign_messages_access" ON campaign_messages
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
