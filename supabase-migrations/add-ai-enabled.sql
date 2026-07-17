-- Toggle de IA por conversa (default true = IA ativa)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
