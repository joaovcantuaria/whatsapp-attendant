-- ============================================
-- SCHEMA DO BANCO DE DADOS - WhatsApp Attendant
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Contatos
create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  phone varchar(20) not null unique,
  name varchar(100),
  email varchar(100),
  profile_picture text,
  tags text[],
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Atendentes
create table if not exists agents (
  id uuid references auth.users(id) primary key,
  name varchar(100) not null,
  email varchar(100) not null unique,
  avatar_url text,
  role varchar(20) default 'agent',
  is_online boolean default false,
  created_at timestamp default now()
);

-- Conversas
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  contact_id uuid references contacts(id) not null,
  agent_id uuid references agents(id),
  status varchar(20) default 'pending',
  channel varchar(20) default 'whatsapp',
  last_message text,
  last_message_at timestamp,
  unread_count int default 0,
  tags text[],
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Mensagens
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) not null,
  whatsapp_message_id varchar(100) unique,
  direction varchar(10) not null,
  type varchar(20) default 'text',
  content text,
  media_url text,
  media_mime_type varchar(50),
  media_filename varchar(200),
  template_name varchar(100),
  template_variables jsonb,
  status varchar(20) default 'sent',
  agent_id uuid references agents(id),
  created_at timestamp default now()
);

-- Templates de mensagem
create table if not exists message_templates (
  id uuid default gen_random_uuid() primary key,
  name varchar(100) not null,
  language varchar(10) default 'pt_BR',
  category varchar(30),
  header_type varchar(20),
  header_content text,
  body text not null,
  footer text,
  buttons jsonb,
  variables jsonb,
  status varchar(20) default 'pending',
  meta_template_id varchar(100) unique,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Respostas rápidas
create table if not exists quick_replies (
  id uuid default gen_random_uuid() primary key,
  title varchar(100) not null,
  content text not null,
  shortcut varchar(50) unique,
  created_by uuid references agents(id),
  created_at timestamp default now()
);

-- Etiquetas/Tags
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  name varchar(50) not null unique,
  color varchar(7) default '#6366f1',
  created_at timestamp default now()
);

-- Notas internas nas conversas
create table if not exists conversation_notes (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) not null,
  agent_id uuid references agents(id) not null,
  content text not null,
  created_at timestamp default now()
);

-- ============================================
-- HABILITAR REALTIME
-- ============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table agents;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table conversations enable row level security;
alter table messages enable row level security;
alter table contacts enable row level security;
alter table message_templates enable row level security;
alter table quick_replies enable row level security;
alter table conversation_notes enable row level security;
alter table agents enable row level security;
alter table tags enable row level security;

-- Policies: agentes autenticados acessam tudo
create policy "Authenticated agents access" on conversations
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on messages
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on contacts
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on message_templates
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on quick_replies
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on conversation_notes
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on agents
  for all using (auth.role() = 'authenticated');

create policy "Authenticated agents access" on tags
  for all using (auth.role() = 'authenticated');

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para incrementar unread
create or replace function increment_unread(conv_id uuid)
returns void as $$
  update conversations set unread_count = unread_count + 1 where id = conv_id;
$$ language sql;

-- Função para zerar unread
create or replace function reset_unread(conv_id uuid)
returns void as $$
  update conversations set unread_count = 0 where id = conv_id;
$$ language sql;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
create index if not exists idx_conversations_status on conversations(status);
create index if not exists idx_conversations_contact_id on conversations(contact_id);
create index if not exists idx_conversations_agent_id on conversations(agent_id);
create index if not exists idx_conversations_last_message_at on conversations(last_message_at desc);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_messages_whatsapp_id on messages(whatsapp_message_id);
create index if not exists idx_contacts_phone on contacts(phone);
