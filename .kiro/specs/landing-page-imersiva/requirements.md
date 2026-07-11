# Landing Page Imersiva - BoraGerir Conversas

## Visão Geral
Redesenho completo da landing page, login e registro para criar uma experiência imersiva, interativa e profissional inspirada no site do Zap Responder. O site deve transmitir confiança, modernidade e conversão — com seções que fluem naturalmente uma sobre a outra (scroll suave), animações sutis e visual premium.

## Referência Visual
- **Estilo**: Zap Responder (ia.zapresponder.com.br)
- **Cor primária**: Laranja (#F26522) — identidade BoraGerir
- **Cor de destaque/accent**: Verde (#25D366) — WhatsApp
- **Fundo**: Branco com seções alternadas (cinza claro / dark para CTAs)
- **Navbar**: Flutuante, centralizada, com blur backdrop

---

## REQ-1: Navbar Flutuante
### Descrição
Navbar sticky no topo, centralizada com bordas arredondadas, fundo branco com blur (glass effect). Links de navegação + botão "Entrar" laranja.

### Itens
- Logo BoraGerir à esquerda
- Links centrais: Funcionalidades | Planos | Empresa
- Botão "Entrar" à direita (laranja, arredondado)
- Scroll suave ao clicar nos links (anchor)
- Mobile: hamburger menu

### Critérios de aceite
- [ ] Navbar fixa no scroll com backdrop-blur
- [ ] Links fazem scroll suave para seções
- [ ] Responsiva em mobile (menu hamburguer)
- [ ] Transição de transparente para branco no scroll

---

## REQ-2: Hero Section
### Descrição
Seção principal de impacto. Grande, limpa, com título forte, subtítulo, selo "Powered by WhatsApp Business API" e CTA principal.

### Itens
- Logo BoraGerir + selo "Powered by WhatsApp Business API"
- Título principal: "Automatize o atendimento no WhatsApp com IA"
- Subtítulo: "Gerencie leads no CRM e dispare campanhas em massa"
- Texto menor: "Com a segurança da API Oficial da Meta."
- CTA: botão "Testar por 14 dias grátis" (laranja, grande)
- Ícones decorativos de WhatsApp e Instagram nos lados
- Animação de entrada (fade-in + slide-up)

### Critérios de aceite
- [ ] Título impactante com hierarquia clara
- [ ] CTA visualmente destacado
- [ ] Animação sutil ao carregar
- [ ] Responsivo (texto centralizado em mobile)

---

## REQ-3: Seção Funcionalidades (Cards Grid)
### Descrição
Grid de funcionalidades com ícones + breve descrição, semelhante ao layout do Zap Responder com cards dispostos em bento-grid.

### Itens
- Badge "Funcionalidades" verde no topo
- Título: "Centralize e Potencialize Seu Atendimento no WhatsApp"
- Subtítulo: "Transforme a comunicação do seu negócio."
- Screenshot do dashboard no lado esquerdo (mockup)
- Cards à direita:
  - Dashboard Intuitivo
  - Vários Atendentes
  - Agendamentos
  - Respostas Rápidas
  - Chat Interno
  - Envios em Massa
  - CRM Integrado
  - Todas as Funcionalidades (link)

### Critérios de aceite
- [ ] Grid responsivo (2 colunas desktop, 1 mobile)
- [ ] Cards com ícone + título + descrição curta
- [ ] Animação stagger ao entrar no viewport (intersection observer)

---

## REQ-4: Seção Features Detalhadas (Tabs Lateral)
### Descrição
Navegação lateral tipo tabs com preview visual de cada funcionalidade — Dashboard, Chat Interno, Integração, CRM, Certificada pela Meta.

### Itens
- Sidebar à esquerda com itens clicáveis:
  - Dashboard
  - Chat Interno
  - Integração
  - CRM
  - Certificada pela Meta
- Conteúdo à direita:
  - Badge de categoria
  - Título descritivo
  - Texto explicativo
  - Screenshot/preview visual
- Seção com fundo verde claro para integração

### Critérios de aceite
- [ ] Troca de conteúdo ao clicar na tab
- [ ] Animação de transição suave entre tabs
- [ ] Responsivo (tabs viram accordion em mobile)
- [ ] Destaque visual na tab ativa

---

## REQ-5: Seção Automações
### Descrição
Destaque para robôs e automações com visual impactante.

### Itens
- Badge "Automações"
- Título: "ROBÔS E AUTOMAÇÕES QUE TRABALHAM POR VOCÊ."
- Texto explicativo
- Lista de features: Robô, Agente de IA, Campanhas Segmentadas
- Preview visual (mockup de campanhas)

### Critérios de aceite
- [ ] Layout 2 colunas (texto + visual)
- [ ] Informação sobre campanhas segmentadas destacada
- [ ] Animação ao scroll

---

## REQ-6: Seção CRM Pipeline
### Descrição
Showcase do CRM com Kanban visual.

### Itens
- Badge "CRM PIPELINE"
- Título: "Acompanhe seus leads em tempo real."
- Subtítulo explicativo
- Preview visual do kanban com colunas coloridas (Contato Inicial, Contato Realizado, Cadastrado, Concluído)
- Cards exemplo com nomes fictícios

### Critérios de aceite
- [ ] Visual do kanban atrativo
- [ ] Colunas com cores diferenciadas
- [ ] Animação de slide-in

---

## REQ-7: Banner de Funcionalidades (Tags Scrolláveis)
### Descrição
Faixa horizontal com tags/badges das funcionalidades principais, com scroll horizontal.

### Itens
- Tags: Vários atendentes, Respostas rápidas, Chat interno, Relatórios, CRM, Webhooks, API
- Scroll horizontal em mobile
- Estilo pill/badge com ícone

### Critérios de aceite
- [ ] Tags com ícone + texto
- [ ] Scroll horizontal suave
- [ ] Visual clean e espaçado

---

## REQ-8: Seção "Comece Agora Mesmo!" (CTA Dark)
### Descrição
Banner escuro (quase preto) com CTA forte para converter.

### Itens
- Fundo dark com gradiente sutil
- Título: "Comece agora mesmo!"
- Subtítulo: "Centralize seus atendimentos em um único WhatsApp"
- Botão "Começar" (branco/laranja)

### Critérios de aceite
- [ ] Contraste forte com seções claras
- [ ] CTA bem visível
- [ ] Animação de fade-in

---

## REQ-9: Seção de Planos e Preços
### Descrição
3 planos em colunas com toggle mensal/trimestral, badges de desconto e tabela de comparação.

### Itens
- Toggle: Plano Mensal / Plano Trimestral (com badge "Até 33%")
- **Plano Starter**:
  - "Saia do improviso"
  - R$ 99/mês
  - 2 atendentes, 500 conversas/mês, Respostas rápidas, Templates, Agente IA
- **Plano Premium** — destaque:
  - "Crescer exige estrutura"
  - R$ 219/mês
  - 5 atendentes, 2.000 conversas/mês, Relatórios, CRM, Tudo do Starter, Recursos avançados (todos liberados)
- **Plano Business**:
  - "Feito pra quem lidera"
  - R$ 497/mês
  - 15 atendentes, 10.000 conversas/mês, API, 5 WhatsApps, Tudo do Premium, Recursos avançados (todos liberados)
- CTA: "Testar por 14 dias" em cada plano
- Plano Premium com fundo escuro (destaque)
- Link "Ver comparação" expansível com features detalhadas

### Critérios de aceite
- [ ] Toggle funcional mensal/trimestral
- [ ] Preços mudam ao alternar
- [ ] Badge de desconto em cada plano
- [ ] Plano Premium visualmente destacado (dark)
- [ ] Botão CTA em cada card
- [ ] Responsivo (stack vertical em mobile)

---

## REQ-10: Footer Completo
### Descrição
Footer profissional com múltiplas colunas de links.

### Itens
- Fundo escuro com grande marca d'água "BORAGERIR" (estilo Zap Responder)
- Logo + selo "Powered by WhatsApp Business API"
- Texto institucional
- Colunas:
  - Funcionalidades: Dashboard, Contatos, Campanhas, CRM, Templates
  - Planos: Starter, Premium, Business
  - Empresa: Sobre nós, Suporte, Contato
- Redes sociais (Instagram, LinkedIn)
- Botão "Ver Planos" laranja
- © 2025 BoraGerir Conversas

### Critérios de aceite
- [ ] Layout multi-coluna
- [ ] Links funcionais
- [ ] Visual dark e profissional
- [ ] Responsivo

---

## REQ-11: Páginas de Login e Registro (Redesign)
### Descrição
Login e Registro com visual minimalista, clean, leve — sem o gradient verde atual. Estilo moderno com fundo branco/cinza claro.

### Itens
- Fundo branco limpo ou cinza muito claro
- Card centralizado, sombra suave
- Logo BoraGerir no topo
- Inputs clean com bordas suaves
- Botão laranja (CTA primário)
- Link para alternar entre login/registro
- Opcional: ilustração sutil ou pattern no lado

### Critérios de aceite
- [ ] Visual limpo sem gradient pesado
- [ ] Consistente com a identidade da landing page
- [ ] Funcionalidade preservada (auth Supabase)
- [ ] Responsivo

---

## REQ-12: Animações e Interatividade
### Descrição
O site deve ser imersivo com animações sutis que guiam o olhar do usuário.

### Itens
- Scroll suave entre seções (smooth scroll)
- Fade-in + slide-up ao entrar no viewport (Intersection Observer ou framer-motion)
- Parallax sutil em backgrounds
- Hover effects em cards e botões
- Stagger animation nos grids de cards
- Transições suaves nas tabs

### Critérios de aceite
- [ ] Animações não prejudicam performance
- [ ] Respeitam `prefers-reduced-motion`
- [ ] Experiência fluida e profissional
- [ ] Sem libs pesadas (preferir CSS + Intersection Observer, ou framer-motion que já é leve)

---

## REQ-13: Responsividade e Performance
### Descrição
Site deve ser performático e funcionar perfeitamente em mobile, tablet e desktop.

### Itens
- Mobile-first design
- Imagens otimizadas (Next.js Image quando possível)
- Font loading otimizado
- Lighthouse score > 90
- Breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px)

### Critérios de aceite
- [ ] Funciona em todas as resoluções
- [ ] Nenhum overflow horizontal
- [ ] Textos legíveis em mobile
- [ ] Loading rápido (< 3s first paint)

---

## Tecnologias
- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion (animações)
- Lucide React (ícones)
- shadcn/ui (componentes base)
- CSS scroll-snap (seções fluidas opcionais)

## Estrutura de Arquivos Proposta
```
app/
├── page.tsx                    (landing page principal - redesign total)
├── (auth)/
│   ├── layout.tsx              (layout clean para auth)
│   ├── login/page.tsx          (redesign)
│   └── register/page.tsx       (redesign)
components/
├── landing/
│   ├── navbar.tsx
│   ├── hero.tsx
│   ├── features-grid.tsx
│   ├── features-tabs.tsx
│   ├── automations.tsx
│   ├── crm-pipeline.tsx
│   ├── tags-scroll.tsx
│   ├── cta-dark.tsx
│   ├── pricing.tsx
│   └── footer.tsx
```
