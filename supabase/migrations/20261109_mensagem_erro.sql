-- Guarda o motivo que a Meta informa quando uma mensagem falha (aparece no X vermelho da conversa)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS error_message TEXT;
