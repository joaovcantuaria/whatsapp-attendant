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

-- 3) Departamentos (filas) e distribuição automática
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#F26522',
  is_default BOOLEAN DEFAULT false,      -- conversa nova sem departamento cai aqui
  auto_assign BOOLEAN DEFAULT true,      -- distribuir automaticamente entre os membros online
  last_assigned_agent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);

CREATE TABLE IF NOT EXISTS department_members (
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  PRIMARY KEY (department_id, agent_id)
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

-- Leitura pelos membros da empresa (escrita só pela API, com service role)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_select_membros" ON departments;
CREATE POLICY "departments_select_membros" ON departments FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active));
DROP POLICY IF EXISTS "department_members_select_membros" ON department_members;
CREATE POLICY "department_members_select_membros" ON department_members FOR SELECT
  USING (department_id IN (
    SELECT d.id FROM departments d
    JOIN company_members cm ON cm.company_id = d.company_id
    WHERE cm.user_id = auth.uid() AND cm.is_active
  ));

-- Distribui conversas novas/reabertas/transferidas para departamento, sem atendente.
-- Roda no banco: vale para a API oficial (webhooks) e para o QR Code (servidor da VPS).
-- Empresa sem departamentos: nada muda.
CREATE OR REPLACE FUNCTION distribuir_conversa() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  dep departments%ROWTYPE;
  escolhido UUID;
BEGIN
  IF NEW.agent_id IS NOT NULL OR NEW.status <> 'pending' OR NEW.company_id IS NULL
     OR NEW.channel = 'whatsapp_group' THEN
    RETURN NEW;
  END IF;
  -- Em UPDATE, só ao reabrir uma conversa fechada ou ao transferir para outro departamento
  IF TG_OP = 'UPDATE' AND NOT (OLD.status = 'closed' OR NEW.department_id IS DISTINCT FROM OLD.department_id) THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT * INTO dep FROM departments WHERE id = NEW.department_id AND company_id = NEW.company_id;
  ELSE
    SELECT * INTO dep FROM departments
    WHERE company_id = NEW.company_id AND is_default
    ORDER BY created_at LIMIT 1;
  END IF;
  IF dep.id IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.department_id := dep.id;
  IF NOT dep.auto_assign THEN
    RETURN NEW;
  END IF;

  -- Membro online e ativo na empresa com menos conversas em andamento; empate: quem não pegou a última
  SELECT dm.agent_id INTO escolhido
  FROM department_members dm
  JOIN agents a ON a.id = dm.agent_id AND a.is_online
  JOIN company_members cm ON cm.user_id = dm.agent_id AND cm.company_id = NEW.company_id AND cm.is_active
  LEFT JOIN LATERAL (
    SELECT count(*) AS abertas FROM conversations c
    WHERE c.agent_id = dm.agent_id AND c.status IN ('pending', 'open')
  ) carga ON true
  WHERE dm.department_id = dep.id
  ORDER BY carga.abertas ASC, (dm.agent_id IS NOT DISTINCT FROM dep.last_assigned_agent_id) ASC, random()
  LIMIT 1;

  IF escolhido IS NOT NULL THEN
    NEW.agent_id := escolhido;
    UPDATE departments SET last_assigned_agent_id = escolhido WHERE id = dep.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_distribuir_conversa ON conversations;
CREATE TRIGGER trg_distribuir_conversa
  BEFORE INSERT OR UPDATE OF status, department_id ON conversations
  FOR EACH ROW EXECUTE FUNCTION distribuir_conversa();

-- 4) Horário de atendimento e mensagem de ausência
-- business_hours: {"0":null,"1":["08:00","18:00"],...,"6":["08:00","12:00"]} (0 = domingo; null = fechado)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS away_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS away_message TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS away_sent_at TIMESTAMPTZ;
