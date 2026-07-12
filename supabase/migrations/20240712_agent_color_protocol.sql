-- Cor do agente
ALTER TABLE agents ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#F26522';

-- Protocolo de atendimento nas conversas
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS protocol TEXT;

-- Gerar protocolos para conversas existentes
UPDATE conversations SET protocol = 'ATD-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0') WHERE protocol IS NULL;

-- Função para gerar protocolo automaticamente
CREATE OR REPLACE FUNCTION generate_protocol()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.protocol IS NULL THEN
    NEW.protocol := 'ATD-' || LPAD(nextval('protocol_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequência para protocolo
CREATE SEQUENCE IF NOT EXISTS protocol_seq START 1000;

-- Trigger
DROP TRIGGER IF EXISTS set_protocol ON conversations;
CREATE TRIGGER set_protocol
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION generate_protocol();
