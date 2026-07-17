-- Adicionar source_phone para separar conversas por número conectado
-- Quando NULL = conversas antigas (antes dessa mudança) - aparecem sempre
-- Quando preenchido = só aparece quando aquele número está conectado

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source_phone TEXT;

-- Adicionar connected_phone na empresa (qual número está conectado via QR Code)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS connected_phone TEXT;

-- Index para filtrar por source_phone
CREATE INDEX IF NOT EXISTS idx_conversations_source_phone 
ON conversations(company_id, source_phone);
