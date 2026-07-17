-- Adicionar campo target_agent_id para mensagens diretas (DM) no team chat
-- Quando NULL = mensagem do grupo geral
-- Quando preenchido = mensagem direta para aquele agente

ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS target_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Index para buscar DMs rapidamente
CREATE INDEX IF NOT EXISTS idx_team_messages_dm 
ON team_messages(agent_id, target_agent_id) 
WHERE target_agent_id IS NOT NULL;
