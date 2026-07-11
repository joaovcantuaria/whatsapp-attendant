# Requisitos — CRM Completo BoraGerir

## Introdução

Sistema de CRM completo voltado para pequenos e médios negócios (prestadores de serviço e lojas). O sistema substitui a aba CRM atual por uma solução robusta com gestão de contatos, funil de vendas, automações, relatórios, comunicação centralizada e gestão de tarefas.

## Módulos

### 1. Gestão de Contatos

**User Story:** Como proprietário do negócio, quero um cadastro completo de clientes para centralizar todas as informações e histórico em um único lugar.

#### Funcionalidades:
- Cadastro com: nome, telefone, email, endereço, canal de origem (WhatsApp, Instagram, indicação, etc.), foto, tags de segmentação
- Perfil individual do cliente com:
  - Histórico de compras/serviços
  - Orçamentos gerados
  - Interações realizadas (mensagens, ligações)
  - Observações personalizadas
  - Valor total gasto (lifetime value)
- Busca e filtro por tags, canal de origem, data de cadastro
- Importação/exportação CSV

### 2. Funil de Vendas (Pipeline)

**User Story:** Como vendedor/gestor, quero visualizar todas as negociações em andamento de forma visual para entender onde cada oportunidade está no processo.

#### Funcionalidades:
- Pipeline visual estilo Kanban com colunas personalizáveis
- Colunas padrão: Novo Lead → Contato Realizado → Proposta Enviada → Negociação → Fechado/Ganho
- Cada card contém: nome do cliente, valor estimado, data de criação, responsável, status
- Drag-and-drop entre colunas
- Registro de motivo de perda ao mover para "Perdido"
- Filtro por responsável, período, valor
- Criação de múltiplos pipelines (ex: Vendas, Pós-venda)

### 3. Automações e Alertas

**User Story:** Como gestor, quero ser alertado automaticamente sobre situações que exigem atenção para não perder oportunidades.

#### Alertas configuráveis:
- Cliente sem comprar há X dias (configurável)
- Negociação parada sem movimentação há X dias
- Aniversário de cliente (hoje/próximos 7 dias)
- Cliente atingiu valor acumulado configurável (VIP)
- Follow-up pendente atrasado

### 4. Relatórios e Inteligência

**User Story:** Como gestor, quero visualizar indicadores de performance do negócio para tomar decisões baseadas em dados.

#### Métricas:
- Ranking de clientes por: valor total, frequência de compra, ticket médio
- Taxa de conversão leads → clientes
- Tempo médio de fechamento de negociações
- Clientes em risco de inatividade
- Receita por período (dia/semana/mês)
- Receita por canal de origem
- Receita por tipo de serviço/produto

### 5. Comunicação Centralizada

**User Story:** Como atendente, quero ver todo o histórico de comunicação com um cliente em um só lugar.

#### Funcionalidades:
- Timeline de comunicação no perfil do cliente
- Integração com conversas do WhatsApp (já existente)
- Envio de mensagens segmentadas para grupos (por tag, comportamento, etc.)
- Registro manual de ligações e emails

### 6. Gestão de Tarefas

**User Story:** Como atendente/vendedor, quero organizar meus follow-ups e compromissos vinculados a clientes.

#### Funcionalidades:
- Criação de tarefas com: título, descrição, cliente vinculado, negociação vinculada, prazo, prioridade, responsável
- Status: pendente, em andamento, concluída, atrasada
- Visão de agenda diária
- Notificação de tarefas atrasadas
- Filtro por responsável, prioridade, status

### 7. Dashboard CRM

**User Story:** Como gestor, quero ver os principais indicadores do CRM assim que abro a página.

#### Indicadores:
- Total de leads no funil
- Valor total em negociações abertas
- Negociações ganhas no mês
- Tarefas pendentes para hoje
- Clientes novos no mês
- Alertas ativos

## Navegação

O CRM será acessado pela aba "CRM" na sidebar, que ao clicar expandirá sub-páginas:
- `/crm` — Dashboard CRM
- `/crm/contacts` — Gestão de Contatos
- `/crm/pipeline` — Funil de Vendas
- `/crm/tasks` — Tarefas
- `/crm/reports` — Relatórios

## Tabelas Necessárias (Supabase)

```sql
-- Deals (negociações)
crm_deals: id, company_id, contact_id, title, value, stage, pipeline_id, agent_id, status (open/won/lost), lost_reason, created_at, updated_at, closed_at

-- Pipelines
crm_pipelines: id, company_id, name, is_default, created_at

-- Pipeline Stages  
crm_pipeline_stages: id, pipeline_id, name, position, color, created_at

-- Tasks
crm_tasks: id, company_id, agent_id, contact_id, deal_id, title, description, due_date, priority (low/medium/high), status (pending/in_progress/completed/overdue), created_at, completed_at

-- Activities (histórico)
crm_activities: id, company_id, contact_id, deal_id, agent_id, type (note/call/email/meeting/whatsapp), content, created_at

-- Alerts
crm_alerts: id, company_id, type, contact_id, deal_id, message, is_read, created_at

-- Purchases (compras/serviços)
crm_purchases: id, company_id, contact_id, description, value, type (product/service), date, created_at
```

## Prioridade de Implementação

**Fase 1 (MVP):** Dashboard CRM + Pipeline + Gestão de Contatos melhorada
**Fase 2:** Tarefas + Atividades/Histórico
**Fase 3:** Relatórios + Automações/Alertas
**Fase 4:** Comunicação segmentada
