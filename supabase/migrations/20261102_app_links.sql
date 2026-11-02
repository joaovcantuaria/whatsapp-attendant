-- Vínculo com o Bora Gerir App (uma empresa do App por company do Chat)
-- O App envia o token "bga_..." que o Chat usa para ler dados dos clientes
-- (aniversariantes, inativos, resumo). O token fica criptografado (AES-256-GCM,
-- chave APP_LINK_ENCRYPTION_KEY). Acesso só via service role: RLS ligado e sem políticas.
CREATE TABLE IF NOT EXISTS app_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  app_url TEXT NOT NULL,
  app_token_enc TEXT NOT NULL,
  empresa_nome TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_links ENABLE ROW LEVEL SECURITY;
