# WhatsApp Attendant - SaaS Multi-Tenant

Sistema completo de atendimento via WhatsApp em formato SaaS, onde múltiplas empresas podem se cadastrar, conectar seu próprio número WhatsApp e operar de forma totalmente isolada.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL, Auth, Realtime, RLS)
- **Tailwind CSS** + **Shadcn/ui**
- **Zustand** (estado global)
- **WhatsApp Cloud API** (Meta v19.0)
- **Recharts** (gráficos)

## Arquitetura Multi-Tenant

Cada empresa (tenant) possui:
- Suas próprias credenciais da Meta (token, phone number ID)
- Webhook exclusivo: `/api/webhook/[company-slug]`
- Dados isolados por RLS no Supabase (`company_id` em todas as tabelas)
- Limites baseados no plano (agentes, conversas/mês)

## Instalação

```bash
cd whatsapp-attendant
npm install
```

## Configuração

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute `supabase/schema.sql` no SQL Editor
3. Execute `supabase/multi-tenant.sql` no SQL Editor
4. Copie as credenciais de Settings > API

### 2. Variáveis de Ambiente

Edite `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
WEBHOOK_SECRET=string_secreta_longa
SUPER_ADMIN_EMAIL=admin@seudominio.com
NEXT_PUBLIC_APP_URL=https://seuapp.vercel.app
```

### 3. Deploy

```bash
npx vercel
```

Configure as variáveis de ambiente no painel da Vercel.

## Como um Novo Cliente Deve Usar

### 1. Criar Conta

1. Acesse a landing page e clique em "Começar grátis"
2. Preencha nome da empresa, nome pessoal, email e senha
3. A conta é criada com 14 dias de trial no plano Starter

### 2. Configurar Meta Business Manager

1. Acesse [business.facebook.com](https://business.facebook.com)
2. Crie um Business Manager (ou use um existente)
3. Adicione o produto WhatsApp Business
4. Verifique seu número de telefone

### 3. Obter Credenciais da API

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um App do tipo Business
3. Adicione o produto WhatsApp
4. Em Configuração da API, obtenha:
   - **Phone Number ID** (exibido na tela principal)
   - **WhatsApp Business Account ID** (na URL ou em configurações)
   - **Access Token** permanente (crie um System User em Business Settings > Users > System Users, atribua permissões WhatsApp e gere um token)

### 4. Configurar o Webhook

1. No painel WA Attendant, vá em Configurações > WhatsApp
2. Cole o Access Token, Phone Number ID e Business Account ID
3. Clique "Testar e Salvar"
4. Copie a URL do Webhook e o Token de Verificação exibidos
5. No Meta for Developers, vá em WhatsApp > Configuração > Webhook
6. Cole a URL no campo "Callback URL" e o token em "Verify Token"
7. Clique "Verify and Save"
8. Marque o campo "messages" nos webhook fields

### 5. Começar a Atender

- Novas mensagens recebidas aparecem automaticamente em Conversas
- Atribua conversas a agentes
- Use templates para mensagens fora da janela de 24h
- Convide agentes em Configurações > Agentes

## Estrutura do Projeto

```
/app
  page.tsx                          → Landing page pública
  /pricing                          → Página de planos
  /(auth)/login, /register          → Autenticação
  /invite/[token]                   → Aceitar convite
  /(dashboard)
    /onboarding                     → Wizard de configuração
    /conversations                  → Chat principal
    /contacts                       → Gerenciamento de contatos
    /templates                      → Templates WhatsApp
    /agents                         → Gerenciar equipe
    /settings/company               → Dados da empresa
    /settings/whatsapp              → Configurar WhatsApp
    /settings/billing               → Plano e faturamento
  /super-admin                      → Painel do dono da plataforma
  /api
    /webhook/[companySlug]          → Webhook por empresa
    /send-message                   → Enviar mensagens
    /companies                      → CRUD empresas
    /invitations                    → Sistema de convites
    /whatsapp/connect               → Conectar WhatsApp
    /super-admin                    → APIs do super admin
/components
  /ui                               → Shadcn/ui
  /chat                             → Interface de chat
  /shared                           → Sidebar, shell
/hooks
  use-company.tsx                   → Context provider da empresa
  use-conversations.ts              → Realtime conversations
  use-messages.ts                   → Realtime messages
/lib
  plan-limits.ts                    → Controle de limites por plano
  meta.ts                           → Integração Meta API
  supabase.ts                       → Cliente browser
  supabase-server.ts                → Cliente server
/store                              → Zustand stores
/types                              → TypeScript interfaces
/supabase
  schema.sql                        → Schema base
  multi-tenant.sql                  → Schema multi-tenant
```

## Planos

| Plano | Preço | Agentes | Conversas/mês |
|-------|-------|---------|---------------|
| Starter | R$ 297 | 2 | 500 |
| Pro | R$ 597 | 5 | 2.000 |
| Business | R$ 997 | 15 | 10.000 |

## Super Admin

Acesse `/super-admin` com o email configurado em `SUPER_ADMIN_EMAIL`. Funcionalidades:
- Overview da plataforma (empresas, receita)
- Listar todas as empresas
- Suspender/reativar empresas
- Alterar planos manualmente

## Licença

MIT
