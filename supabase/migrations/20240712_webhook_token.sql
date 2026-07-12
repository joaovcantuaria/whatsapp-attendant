-- Token de verificação do webhook por empresa
ALTER TABLE companies ADD COLUMN IF NOT EXISTS webhook_verify_token TEXT;

-- Gerar tokens para empresas existentes
UPDATE companies SET webhook_verify_token = 'bgw_' || encode(gen_random_bytes(16), 'hex') WHERE webhook_verify_token IS NULL;
