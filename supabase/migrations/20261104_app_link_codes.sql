-- Códigos de autorização do fluxo "Conectar com BoraGerir Chat" (estilo OAuth + PKCE)
-- O dono da empresa autoriza em /conectar-app; o Bora Gerir App troca o código
-- (uso único, 5 minutos) pela API key em /api/external/app-link/token.
-- Guarda só o SHA-256 do código. Acesso só via service role: RLS ligado e sem políticas.
CREATE TABLE IF NOT EXISTS app_link_codes (
  code_hash TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  code_challenge TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_link_codes ENABLE ROW LEVEL SECURITY;
