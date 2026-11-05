# Leva 2 — como ativar

Pré-requisito: Leva 1 já ativada (ver `LEVA1-ATIVACAO.md`).

## 1. Migration (Supabase do Chat → SQL Editor)
Rodar `supabase/migrations/20261106_leva2_ia_crm.sql` **antes** de publicar. Pode rodar mais de uma vez.
Sem ela: a transcrição, o copiloto (que lê `transcription`), os campos personalizados e as automações do funil falham.

## 2. Nada de variável nova
Tudo usa a chave de IA que a empresa já configura em **Agente de IA → Configuração**.

| Recurso | Provedores |
|---|---|
| Base de conhecimento, copiloto | Groq, Gemini ou OpenAI |
| Transcrição de áudio | Groq (whisper-large-v3-turbo) ou OpenAI (whisper-1) |

## 3. Depois de publicar
- **Agente de IA → Base de conhecimento**: cadastrar preços, horários, endereço, pagamentos e FAQ (ou importar a página do site).
- **No chat**: botão ✨ (Sugerir resposta / Resumir conversa) e "Transcrever áudio" nos áudios.
- **Configurações → Campos Personalizados**: criar os campos; editar no perfil do CRM ou no painel do chat. Nas campanhas, use `{{campo:chave}}` como valor de uma variável.
- **CRM → ⚡ no topo de cada etapa**: criar tarefa, enviar template ou texto quando o negócio entra na etapa.

## Correções de segurança incluídas
- `/api/crm/contacts/[id]` (GET e PATCH) liam e alteravam contatos de qualquer empresa e aceitavam qualquer coluna.
- `PATCH /api/crm/pipeline` aceitava qualquer coluna do negócio (inclusive `company_id`).

## Limitações
- Texto livre do funil só é entregue se o cliente falou nas últimas 24h (regra da Meta) — a automação registra quando não envia.
- A base de conhecimento busca por palavras (sem embeddings): funciona bem para FAQ e tabelas; textos muito longos e genéricos rendem menos.
