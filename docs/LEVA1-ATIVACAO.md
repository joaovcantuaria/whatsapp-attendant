# Leva 1 — como ativar

Ordem: **1 → 2 → 3 → publicar → 4**. Sem o passo 1, o envio de campanhas falha (a consulta usa a coluna `opted_out`).

## 1. Migration (Supabase do Chat → SQL Editor)
Rodar `supabase/migrations/20261105_leva1_fundamentos.sql`. Pode rodar mais de uma vez sem problema.

## 2. Variáveis na Vercel do Chat
| Variável | Valor |
|---|---|
| `CRON_SECRET` | um segredo aleatório (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `WHATSAPP_SERVER_URL` | opcional — só se a VPS mudar de endereço (ex.: `http://NOVO-IP:3001`) |
| `WHATSAPP_SERVER_API_KEY` | opcional — a mesma `API_KEY` do `.env` da VPS |

## 3. Agendador a cada minuto (Supabase → Database → Extensions)
Ativar **pg_cron** e **pg_net**. Depois, no SQL Editor (troque `SEU_CRON_SECRET`):

```sql
SELECT cron.schedule(
  'boragerir-processar',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://chat.boragerir.com/api/cron/processar',
    headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
```

Conferir execuções: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
Desligar: `SELECT cron.unschedule('boragerir-processar');`

A Vercel também chama o mesmo endereço 1x por dia (vercel.json), como reserva.

## 4. Depois de publicar
- Configurações → **Departamentos**: criar ao menos um departamento **padrão** com os atendentes.
- Configurações → **Horário de Atendimento**: dias, horários e mensagem de ausência.
- Testar: mandar "SAIR" de um celular → o contato fica descadastrado e recebe a confirmação; "VOLTAR" desfaz.

## Limitações conhecidas
- Mensagem de ausência e confirmação do SAIR saem só pela **API oficial** (o QR Code recebe pela VPS, que ainda não chama essas regras). A distribuição por departamento vale para os dois, porque roda no banco.
- A distribuição usa `agents.is_online`; quem fecha o navegador sem sair pode continuar "online".
