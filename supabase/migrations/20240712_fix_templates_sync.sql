-- ============================================
-- FIX: Templates sync com Meta
-- 1. Remove unique global do meta_template_id (conflita com multi-tenant)
-- 2. Cria unique composto (company_id, meta_template_id) 
-- 3. Garante coluna rejected_reason existe
-- ============================================

-- Remover constraint unique global do meta_template_id
ALTER TABLE message_templates DROP CONSTRAINT IF EXISTS message_templates_meta_template_id_key;

-- Criar unique composto que permite multi-tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_company_meta_id 
  ON message_templates(company_id, meta_template_id) 
  WHERE meta_template_id IS NOT NULL;

-- Garantir que a coluna rejected_reason existe
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Index auxiliar para buscas por company
CREATE INDEX IF NOT EXISTS idx_templates_company ON message_templates(company_id);
