-- Tabela de avaliações de satisfação
CREATE TABLE IF NOT EXISTS satisfaction_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  template_sent_at TIMESTAMPTZ,
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_satisfaction_company ON satisfaction_ratings(company_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_rating ON satisfaction_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_satisfaction_rated_at ON satisfaction_ratings(rated_at);
CREATE INDEX IF NOT EXISTS idx_satisfaction_contact ON satisfaction_ratings(contact_id);

-- RLS
ALTER TABLE satisfaction_ratings ENABLE ROW LEVEL SECURITY;

-- Política: membros da empresa podem ver as avaliações
CREATE POLICY "Company members can view ratings" ON satisfaction_ratings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Política: service role (servidor) pode inserir
CREATE POLICY "Service role full access on satisfaction_ratings" ON satisfaction_ratings
  FOR ALL USING (true) WITH CHECK (true);
