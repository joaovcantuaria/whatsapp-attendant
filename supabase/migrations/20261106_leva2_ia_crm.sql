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
