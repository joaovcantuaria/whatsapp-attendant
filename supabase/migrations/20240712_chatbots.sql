-- Fluxos de Chatbot (robôs)
CREATE TABLE IF NOT EXISTS chatbot_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT DEFAULT 'keyword', -- keyword, first_message, always
  trigger_keywords TEXT[], -- palavras que ativam o robô
  priority INTEGER DEFAULT 0, -- maior = mais prioridade
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nós do fluxo (etapas)
CREATE TABLE IF NOT EXISTS chatbot_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES chatbot_flows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL DEFAULT 'message', -- message, options, action, condition, delay
  title TEXT NOT NULL,
  message TEXT, -- mensagem que o robô envia
  options JSONB, -- [{ value: "1", label: "Vendas", next_node_id: "..." }]
  action_type TEXT, -- transfer_agent, add_tag, move_crm, close, webhook
  action_data JSONB, -- dados da ação (tag name, stage_id, etc)
  delay_seconds INTEGER DEFAULT 0, -- delay antes de enviar
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  is_start BOOLEAN DEFAULT false, -- nó inicial do fluxo
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões ativas do chatbot (rastreia onde cada contato está no fluxo)
CREATE TABLE IF NOT EXISTS chatbot_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  conversation_id UUID,
  contact_phone TEXT NOT NULL,
  flow_id UUID NOT NULL REFERENCES chatbot_flows(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES chatbot_nodes(id),
  status TEXT DEFAULT 'active', -- active, completed, transferred
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}' -- dados coletados durante o fluxo
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_company ON chatbot_flows(company_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_active ON chatbot_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_chatbot_nodes_flow ON chatbot_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_phone ON chatbot_sessions(contact_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_status ON chatbot_sessions(status);

-- RLS
ALTER TABLE chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_flows_access" ON chatbot_flows
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "chatbot_nodes_access" ON chatbot_nodes
  FOR ALL USING (flow_id IN (SELECT id FROM chatbot_flows WHERE company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true)));

CREATE POLICY "chatbot_sessions_access" ON chatbot_sessions
  FOR ALL USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true));
