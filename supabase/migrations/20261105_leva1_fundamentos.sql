-- ============================================================
-- Leva 1 — fundamentos do BoraGerir Chat
-- Rodar ANTES de publicar o código desta leva.
-- ============================================================

-- 1) Descadastro ("SAIR" / "VOLTAR"): quem saiu não recebe campanhas nem automações
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- 2) Fila de campanhas: busca rápida das mensagens pendentes de cada campanha
CREATE INDEX IF NOT EXISTS idx_campaign_messages_fila
  ON campaign_messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_agendadas
  ON campaigns(scheduled_at) WHERE status = 'scheduled';
