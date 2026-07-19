# Requirements Document

## Introduction

Integração do Mercado Pago como gateway de pagamento para cobrança recorrente de assinaturas na plataforma BoraGerir Conversas. A solução utiliza o checkout transparente (Transparent Checkout) do Mercado Pago, com formulário de cartão embutido diretamente na página `/settings/billing`, sem redirecionamento para páginas externas. Cobre o ciclo completo de vida da assinatura: criação, cobrança recorrente, upgrade/downgrade de plano, conversão de trial para pago, cancelamento e histórico de pagamentos.

## Glossary

- **Checkout_Transparente**: Formulário de pagamento do Mercado Pago embutido diretamente na página da aplicação usando o SDK MercadoPago.js, sem redirecionamento externo
- **Subscription_Service**: Módulo backend responsável por criar, atualizar e cancelar assinaturas no Mercado Pago via API REST
- **Webhook_Handler**: Endpoint da API que recebe notificações do Mercado Pago sobre mudanças de status de pagamento
- **Payment_Processor**: Componente que processa tokens de cartão gerados pelo SDK frontend e cria cobranças via API do Mercado Pago
- **Billing_Page**: Página existente em `/settings/billing` onde o usuário visualiza e gerencia sua assinatura
- **Plan**: Registro na tabela `plans` do Supabase contendo nome, preço, limites e recursos de cada plano disponível
- **Company**: Registro na tabela `companies` do Supabase representando uma empresa assinante com `plan_id` e `plan_status`
- **Subscription_Record**: Registro na tabela `subscriptions` do Supabase que armazena o estado local da assinatura vinculada ao Mercado Pago
- **Invoice**: Registro na tabela `invoices` do Supabase representando uma cobrança individual (aprovada, pendente ou rejeitada)
- **MercadoPago_SDK**: Biblioteca JavaScript oficial do Mercado Pago (`@mercadopago/sdk-react`) para renderizar campos de cartão seguros no frontend
- **Access_Token**: Credencial de produção do Mercado Pago usada no backend para autenticar chamadas à API REST
- **Public_Key**: Chave pública do Mercado Pago usada no frontend para inicializar o SDK e gerar tokens de cartão

## Requirements

### Requirement 1: Inicialização do SDK e Renderização do Formulário de Cartão

**User Story:** As a company admin, I want to see a credit card form embedded directly on the billing page, so that I can enter payment details without being redirected to an external site.

#### Acceptance Criteria

1. WHEN the Billing_Page loads, THE MercadoPago_SDK SHALL initialize using the Public_Key stored in environment variables
2. WHEN the MercadoPago_SDK initializes successfully, THE Checkout_Transparente SHALL render secure input fields for card number, expiration date, security code, and cardholder name
3. WHEN the MercadoPago_SDK fails to initialize, THE Billing_Page SHALL display an error message "Erro ao carregar formulário de pagamento. Tente novamente." with a retry button
4. THE Checkout_Transparente SHALL display input field labels and placeholders in Brazilian Portuguese
5. WHILE the Checkout_Transparente is rendering, THE Billing_Page SHALL display a loading skeleton in place of the form fields

### Requirement 2: Tokenização de Cartão e Criação de Assinatura

**User Story:** As a company admin, I want to submit my card details and subscribe to a plan, so that my company gets access to the selected plan features.

#### Acceptance Criteria

1. WHEN the user submits the payment form, THE MercadoPago_SDK SHALL generate a card token from the entered card data
2. WHEN the card token is generated successfully, THE Payment_Processor SHALL send the token along with the selected plan ID and billing cycle (monthly or yearly) to the backend API
3. WHEN the backend receives a valid card token, THE Subscription_Service SHALL create a subscription in the Mercado Pago API with the corresponding plan amount and recurrence period
4. WHEN the Mercado Pago API returns a successful subscription creation, THE Subscription_Service SHALL store a Subscription_Record in the `subscriptions` table with `mp_subscription_id`, `company_id`, `plan_id`, `status`, `billing_cycle`, and `current_period_end`
5. WHEN the subscription is created successfully, THE Subscription_Service SHALL update the Company record setting `plan_id` to the selected plan and `plan_status` to "active"
6. IF the card token generation fails, THEN THE Billing_Page SHALL display the specific validation error returned by the MercadoPago_SDK (e.g., "Número do cartão inválido")
7. IF the Mercado Pago API rejects the subscription creation, THEN THE Billing_Page SHALL display the rejection reason in user-friendly Portuguese (e.g., "Cartão recusado. Tente outro cartão.")

### Requirement 3: Processamento de Webhooks de Pagamento

**User Story:** As a system operator, I want the platform to automatically process payment status notifications from Mercado Pago, so that subscription statuses stay synchronized without manual intervention.

#### Acceptance Criteria

1. THE Webhook_Handler SHALL expose a POST endpoint at `/api/webhooks/mercadopago` that accepts notification payloads from Mercado Pago
2. WHEN the Webhook_Handler receives a notification, THE Webhook_Handler SHALL validate the request signature using the Mercado Pago webhook secret
3. IF the webhook signature validation fails, THEN THE Webhook_Handler SHALL return HTTP 401 and log the attempt without processing
4. WHEN the Webhook_Handler receives a `payment.approved` notification, THE Subscription_Service SHALL update the corresponding Invoice status to "approved" and confirm the Company `plan_status` as "active"
5. WHEN the Webhook_Handler receives a `payment.pending` notification, THE Subscription_Service SHALL update the corresponding Invoice status to "pending"
6. WHEN the Webhook_Handler receives a `payment.rejected` notification, THE Subscription_Service SHALL update the corresponding Invoice status to "rejected" and create a failed payment record
7. WHEN the Webhook_Handler receives a `subscription.cancelled` notification, THE Subscription_Service SHALL update the Subscription_Record status to "cancelled" and set the Company `plan_status` to "cancelled"
8. WHEN a payment is rejected 3 consecutive times for the same subscription, THE Subscription_Service SHALL update the Company `plan_status` to "suspended"
9. THE Webhook_Handler SHALL return HTTP 200 within 5 seconds of receiving a notification to prevent Mercado Pago from retrying
10. THE Webhook_Handler SHALL be idempotent — processing the same notification multiple times SHALL produce the same result

### Requirement 4: Upgrade e Downgrade de Plano

**User Story:** As a company admin, I want to change my current plan, so that I can scale my subscription up or down based on my team's needs.

#### Acceptance Criteria

1. WHEN the user selects a different plan on the Billing_Page, THE Billing_Page SHALL display the price difference and effective date of the change
2. WHEN the user confirms a plan upgrade, THE Subscription_Service SHALL update the subscription in Mercado Pago with the new plan amount effective immediately
3. WHEN a plan upgrade is confirmed, THE Subscription_Service SHALL calculate the prorated amount for the remaining days of the current billing period and charge the difference
4. WHEN the user confirms a plan downgrade, THE Subscription_Service SHALL schedule the plan change to take effect at the end of the current billing period
5. WHEN a scheduled downgrade reaches the end of the billing period, THE Subscription_Service SHALL update the Company `plan_id` to the new plan and adjust the subscription amount in Mercado Pago
6. WHILE a plan downgrade is scheduled, THE Billing_Page SHALL display a notice showing the current plan, the future plan, and the effective change date
7. IF the new plan has lower limits than the company's current usage, THEN THE Billing_Page SHALL display a warning listing which limits will be exceeded after the change

### Requirement 5: Conversão de Trial para Plano Pago

**User Story:** As a company admin on a trial, I want to activate a paid plan before my trial expires, so that my team can continue using the platform without interruption.

#### Acceptance Criteria

1. WHILE the Company `plan_status` is "trial", THE Billing_Page SHALL display a prominent call-to-action to activate a paid plan with the remaining trial days
2. WHEN a trial user submits payment for a plan, THE Subscription_Service SHALL create the subscription and update `plan_status` from "trial" to "active"
3. WHEN the trial period expires without payment, THE Subscription_Service SHALL update the Company `plan_status` to "suspended"
4. WHILE the Company `plan_status` is "suspended" due to trial expiration, THE Billing_Page SHALL display a reactivation prompt with the payment form
5. WHEN a suspended company completes payment, THE Subscription_Service SHALL update `plan_status` to "active" and restore full platform access

### Requirement 6: Histórico de Pagamentos e Faturas

**User Story:** As a company admin, I want to view my payment history and invoice details, so that I can track billing and share records with my finance team.

#### Acceptance Criteria

1. THE Billing_Page SHALL display a payment history section listing all Invoice records for the Company, ordered by date descending
2. WHEN the payment history loads, THE Billing_Page SHALL show for each Invoice: date, amount, status (aprovado/pendente/rejeitado), billing period, and last 4 digits of the card used
3. WHEN the user clicks on an individual Invoice, THE Billing_Page SHALL display full invoice details including Mercado Pago payment ID, payment method, and status timeline
4. THE Billing_Page SHALL allow the user to filter payment history by status (all, approved, pending, rejected)
5. IF there are no Invoice records, THEN THE Billing_Page SHALL display an empty state message "Nenhuma fatura encontrada"

### Requirement 7: Cancelamento de Assinatura

**User Story:** As a company admin, I want to cancel my subscription, so that I stop being charged while understanding what I will lose.

#### Acceptance Criteria

1. WHEN the user clicks "Cancelar Assinatura" on the Billing_Page, THE Billing_Page SHALL display a confirmation dialog explaining that access continues until the end of the current billing period
2. WHEN the user confirms cancellation, THE Subscription_Service SHALL cancel the subscription in the Mercado Pago API
3. WHEN the Mercado Pago API confirms cancellation, THE Subscription_Service SHALL update the Subscription_Record status to "pending_cancellation" and store the `cancellation_effective_date` as the end of the current billing period
4. WHILE the Subscription_Record status is "pending_cancellation", THE Billing_Page SHALL display the cancellation effective date and a button to reactivate
5. WHEN the user clicks "Reativar Assinatura" before the effective cancellation date, THE Subscription_Service SHALL reactivate the subscription in Mercado Pago and update the Subscription_Record status to "active"
6. WHEN the cancellation effective date is reached, THE Subscription_Service SHALL update the Company `plan_status` to "cancelled"

### Requirement 8: Segurança e Armazenamento de Credenciais

**User Story:** As a system operator, I want payment credentials to be securely stored and transmitted, so that the platform complies with PCI DSS requirements.

#### Acceptance Criteria

1. THE Subscription_Service SHALL store the Mercado Pago Access_Token exclusively in server-side environment variables, inaccessible from client-side code
2. THE Checkout_Transparente SHALL transmit card data directly to Mercado Pago servers via the SDK — card numbers, CVV, and expiration dates SHALL NOT pass through the application backend
3. THE Subscription_Service SHALL store only the last 4 digits of the card and the card brand in the `subscriptions` table for display purposes
4. THE Webhook_Handler SHALL validate the `x-signature` header on every incoming webhook request before processing
5. THE Billing_Page SHALL only be accessible to authenticated users with the "admin" or "owner" role within their company

### Requirement 9: Tabelas de Banco de Dados para Assinaturas

**User Story:** As a developer, I want a clear database schema for subscription data, so that the system can reliably track subscription state and payment history.

#### Acceptance Criteria

1. THE Subscription_Service SHALL use a `subscriptions` table with columns: `id`, `company_id`, `plan_id`, `mp_subscription_id`, `mp_payer_id`, `status` (active, pending_cancellation, cancelled, suspended), `billing_cycle` (monthly, yearly), `card_last_four`, `card_brand`, `current_period_start`, `current_period_end`, `cancellation_effective_date`, `created_at`, `updated_at`
2. THE Subscription_Service SHALL use an `invoices` table with columns: `id`, `subscription_id`, `company_id`, `mp_payment_id`, `amount`, `currency` (BRL), `status` (approved, pending, rejected), `billing_period_start`, `billing_period_end`, `card_last_four`, `failure_reason`, `paid_at`, `created_at`
3. THE Subscription_Service SHALL enforce a unique constraint on `mp_subscription_id` in the `subscriptions` table
4. THE Subscription_Service SHALL enforce a unique constraint on `mp_payment_id` in the `invoices` table
5. THE Subscription_Service SHALL create a foreign key from `subscriptions.company_id` to `companies.id`
6. THE Subscription_Service SHALL create a foreign key from `invoices.subscription_id` to `subscriptions.id`
