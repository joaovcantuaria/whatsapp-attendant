-- ============================================================
-- Leva 2 — IA e CRM do BoraGerir Chat
-- Rodar ANTES de publicar o código desta leva (depois da Leva 1).
-- ============================================================

-- 1) Base de conhecimento da IA (textos, FAQs e páginas importadas do site)
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_company ON ai_knowledge(company_id);
ALTER TABLE ai_knowledge ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_knowledge_select_membros" ON ai_knowledge;
CREATE POLICY "ai_knowledge_select_membros" ON ai_knowledge FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));

-- 2) Transcrição de áudio
ALTER TABLE messages ADD COLUMN IF NOT EXISTS transcription TEXT;

-- 3) Campos personalizados de contato
CREATE TABLE IF NOT EXISTS contact_field_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'texto' CHECK (type IN ('texto', 'numero', 'data', 'lista')),
  options TEXT[],
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, key)
);
ALTER TABLE contact_field_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_fields_select_membros" ON contact_field_definitions;
CREATE POLICY "contact_fields_select_membros" ON contact_field_definitions FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4) Automações por etapa do funil (disparam quando um negócio ENTRA na etapa)
CREATE TABLE IF NOT EXISTS crm_stage_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES crm_pipeline_stages(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('criar_tarefa', 'enviar_template', 'enviar_texto')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_stage_automations_stage ON crm_stage_automations(stage_id) WHERE is_active;
ALTER TABLE crm_stage_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_stage_automations_select_membros" ON crm_stage_automations;
CREATE POLICY "crm_stage_automations_select_membros" ON crm_stage_automations FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));
