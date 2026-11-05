# Leva 3 — como ativar

Pré-requisitos: Levas 1 e 2 ativadas, agendador (pg_cron) rodando a cada minuto e o App conectado
(no Bora Gerir App: Configurações → Chat → **Conectar com BoraGerir Chat**).

## 1. Migrations
| Onde | Arquivo |
|---|---|
| Supabase do **Chat** | `supabase/migrations/20261107_leva3_crescimento.sql` |
| Supabase do **App** | `beautyflow/supabase/migrations/20261107_cupons_cliente.sql` |

Publicar **depois** das migrations: primeiro o App (cupons e agendamentos na API), depois o Chat.

## 2. Templates na Meta (um por automação)
Crie e aprove na tela **Templates** (categoria Marketing para aniversário/reativação, Utilidade para lembrete). Exemplos:

- **Aniversário:** `Feliz aniversário, {{1}}! 🎉 A {{2}} preparou um presente: use o cupom {{3}} e ganhe {{4}} de desconto até {{5}}.`
- **Reativação:** `Oi, {{1}}! Sentimos sua falta na {{2}}. Volte com {{3}} de desconto usando o cupom {{4}}.`
- **Lembrete:** `Olá, {{1}}! Lembrando do seu horário de {{2}} em {{3}} às {{4}}. Até lá!`

Na tela **Automações**, escolha o template e o que vai em cada `{{n}}`.

## 3. Ativar
Menu **Automações**: configure, clique em **Ver quem recebe agora** (não envia nada) e depois em **Ativar**.
- Aniversário e reativação rodam 1x por dia no horário escolhido (Brasília).
- Lembrete roda a cada 15 minutos para os horários nas próximas N horas.
- Cada cliente recebe no máximo 1 mensagem por ocasião; quem respondeu SAIR nunca recebe.
- O cupom é criado no App e resgatado no PDV (campo **Cupom**), uma única vez, só pelo próprio cliente.

## 4. Links de entrada
Menu **Links de entrada**: crie um link por canal (Instagram, panfleto, site). Copie o link ou baixe o QR Code.
Quando o cliente manda a mensagem pronta (que termina em `#CODIGO`), o Chat registra a origem, aplica a etiqueta
e coloca a conversa no departamento do link.

## Limitações
- Automações e links funcionam pela **API oficial** (templates). No QR Code, a mensagem do link chega pela VPS e não registra a origem.
- Se um envio for interrompido no meio (queda do servidor), aquele cliente fica marcado como tratado e não recebe de novo — preferimos não arriscar mensagem duplicada.
- Métricas de SLA por atendente já existem no painel **Supervisor** (tempo médio de primeira resposta e taxa de resolução).
