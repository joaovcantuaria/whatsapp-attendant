export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'template' | 'button' | 'interactive' | 'reaction' | 'internal_note'
export type MessageDirection = 'inbound' | 'outbound' | 'internal'
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'
export type ConversationStatus = 'pending' | 'open' | 'closed'
export type AgentRole = 'admin' | 'agent'
export type CompanyRole = 'owner' | 'admin' | 'agent'
export type TemplateCategory = 'marketing' | 'utility' | 'authentication'
export type WindowStatus = 'open' | 'expiring' | 'closed'
export type PlanStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

export interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  max_agents: number
  max_conversations_per_month: number | null
  features: Record<string, boolean>
  is_active: boolean
  created_at: string
}

export interface Company {
  id: string
  name: string
  slug: string
  email: string
  phone: string | null
  document: string | null
  logo_url: string | null
  plan_id: string | null
  plan_status: PlanStatus
  trial_ends_at: string | null
  subscription_id: string | null
  whatsapp_token: string | null
  whatsapp_phone_number_id: string | null
  whatsapp_business_account_id: string | null
  whatsapp_connected: boolean
  webhook_url: string | null
  welcome_message: string | null
  away_message: string | null
  business_hours: Record<string, unknown> | null
  away_message_enabled: boolean
  welcome_message_enabled: boolean
  created_at: string
  updated_at: string
  plan?: Plan
}

export interface CompanyMember {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  is_active: boolean
  invited_by: string | null
  invited_at: string
  joined_at: string | null
}

export interface Invitation {
  id: string
  company_id: string
  email: string
  role: CompanyRole
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface UsageLog {
  id: string
  company_id: string
  month: string
  conversations_count: number
  messages_sent: number
  messages_received: number
}

export interface Contact {
  id: string
  company_id: string
  phone: string
  name: string | null
  email: string | null
  profile_picture: string | null
  tags: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: AgentRole
  is_online: boolean
  greeting_message: string | null
  created_at: string
}

export interface Conversation {
  id: string
  company_id: string
  contact_id: string
  agent_id: string | null
  department_id?: string | null
  status: ConversationStatus
  channel: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  tags: string[] | null
  created_at: string
  updated_at: string
  contact?: Contact
  agent?: Agent
}

export interface Message {
  id: string
  company_id: string
  conversation_id: string
  whatsapp_message_id: string | null
  direction: MessageDirection
  type: MessageType
  content: string | null
  transcription?: string | null
  media_url: string | null
  media_mime_type: string | null
  media_filename: string | null
  template_name: string | null
  template_variables: Record<string, unknown> | null
  status: MessageStatus
  agent_id: string | null
  created_at: string
}

export interface MessageTemplate {
  id: string
  company_id: string
  name: string
  language: string
  category: TemplateCategory | null
  header_type: string | null
  header_content: string | null
  body: string
  footer: string | null
  buttons: Record<string, unknown>[] | null
  variables: Record<string, unknown> | null
  status: string
  meta_template_id: string | null
  created_at: string
  updated_at: string
}

export interface QuickReply {
  id: string
  company_id: string
  title: string
  content: string
  shortcut: string | null
  created_by: string | null
  created_at: string
}

export interface ConversationNote {
  id: string
  conversation_id: string
  agent_id: string
  content: string
  created_at: string
  agent?: Agent
}

export interface Tag {
  id: string
  company_id: string
  name: string
  color: string
  created_at: string
}

export interface DashboardMetrics {
  totalConversationsToday: number
  openConversations: number
  pendingConversations: number
  closedConversations: number
  averageResponseTime: number
  messagesLast7Days: { date: string; count: number }[]
  conversationsByAgent: { agent: string; count: number }[]
  resolutionRate: number
}

export interface WebhookMessage {
  from: string
  id: string
  timestamp: string
  type: MessageType
  text?: { body: string }
  image?: { id: string; mime_type: string; caption?: string }
  audio?: { id: string; mime_type: string }
  video?: { id: string; mime_type: string; caption?: string }
  document?: { id: string; mime_type: string; filename: string }
  sticker?: { id: string; mime_type: string }
  location?: { latitude: number; longitude: number; name?: string; address?: string }
  button?: { text: string; payload: string }
  interactive?: { type: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string; description?: string } }
  reaction?: { message_id: string; emoji: string }
}

export interface WebhookStatus {
  id: string
  status: MessageStatus
  timestamp: string
  recipient_id: string
}

export interface SuperAdminMetrics {
  totalCompanies: number
  activeCompanies: number
  trialCompanies: number
  estimatedMonthlyRevenue: number
  companiesByMonth: { month: string; count: number }[]
}
