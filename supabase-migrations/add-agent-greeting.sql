-- Adicionar campo de mensagem de apresentação no perfil do agente
ALTER TABLE agents ADD COLUMN IF NOT EXISTS greeting_message TEXT;
