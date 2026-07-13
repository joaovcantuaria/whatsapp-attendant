# BoraGerir WhatsApp Server

Microserviço que conecta números WhatsApp via QR Code usando Baileys.
Funciona como backend do BoraGerir Chat para conexões não-oficiais.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/instance/connect` | Inicia conexão (gera QR) |
| GET | `/api/instance/status/:id` | Status + QR da instância |
| GET | `/api/instance/qr/:id` | Apenas o QR Code |
| POST | `/api/instance/disconnect` | Desconecta instância |
| POST | `/api/instance/restart` | Reinicia instância |
| POST | `/api/message/send-text` | Envia mensagem de texto |
| POST | `/api/message/send-media` | Envia imagem/vídeo/áudio |
| GET | `/api/instances` | Lista todas as instâncias |
| GET | `/health` | Health check |

## Auth

Todas as rotas em `/api/*` requerem header `x-api-key` com o valor do `API_KEY`.

## Deploy no Railway

1. Crie um novo projeto no Railway
2. Conecte este repositório (ou esta pasta)
3. Defina as variáveis de ambiente:
   - `PORT`: 3001
   - `SUPABASE_URL`: URL do seu Supabase
   - `SUPABASE_SERVICE_KEY`: Service role key
   - `API_KEY`: Uma chave secreta que você definir
4. Deploy automático a cada push

## Desenvolvimento local

```bash
cp .env.example .env
# Preencha as variáveis
npm install
npm run dev
```

## Como funciona

1. Frontend chama `POST /api/instance/connect` com `instanceId` (company_id)
2. Server gera QR Code e retorna como base64
3. Usuário escaneia no WhatsApp
4. Conexão estabelecida → mensagens recebidas salvam no Supabase
5. Frontend envia mensagens via `POST /api/message/send-text`
6. Tudo sincroniza via Supabase Realtime
