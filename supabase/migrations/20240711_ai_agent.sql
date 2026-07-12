-- Configuração do Agente IA por empresa
CREATE TABLE IF NOT EXISTS ai_agent_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  provider TEXT DEFAULT 'groq', -- groq, gemini, openai
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  api_key TEXT, -- encrypted in production
  system_prompt TEXT DEFAULT 'Você é um assistente de atendimento profissional e prestativo. Responda de forma educada, objetiva e ajude o cliente com suas dúvidas. Se não souber a resposta, diga que vai transferir para um atendente humano.',
  greeting_message TEXT DEFAULT 'Olá! Sou o assistente virtual. Como posso ajudar?',
  transfer_keywords TEXT[] DEFAULT ARRAY['humano', 'atendente', 'pessoa', 'falar com alguém'],
  max_messages_before_transfer INTEGER DEFAULT 10,
  active_hours_start TIME DEFAULT '08:00',
  active_hours_end TIME DEFAULT '22:00',
  active_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=dom, 1=seg...6=sab
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 500,
  context_messages INTEGER DEFAULT 5, -- quantas mensagens anteriores enviar como contexto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de mensagens do agente IA
CREATE TABLE IF NOT EXISTS ai_agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  conversation_id UUID,
  contact_phone TEXT,
  user_message TEXT,
  ai_response TEXT,
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  transferred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_config_company ON ai_agent_config(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_company ON ai_agent_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_logs_conversation ON ai_agent_logs(conversation_id);

ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_config_company_access" ON ai_agent_config
  FOR ALL USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "ai_logs_company_access" ON ai_agent_logs
  FOR ALL USING (
    company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true)
  );

-- Adicionar coluna lost_reason na tabela de deals do CRM
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;
