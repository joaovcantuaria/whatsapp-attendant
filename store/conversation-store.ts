import { create } from 'zustand'
import { Conversation, ConversationStatus } from '@/types'

type FilterType = ConversationStatus | 'all' | 'groups'

interface ConversationStore {
  selectedConversation: Conversation | null
  filter: FilterType
  searchQuery: string
  agentFilter: string | 'all'
  departmentFilter: string | 'all'
  channelFilter: 'all' | 'whatsapp' | 'instagram'
  setSelectedConversation: (conversation: Conversation | null) => void
  setFilter: (filter: FilterType) => void
  setSearchQuery: (query: string) => void
  setAgentFilter: (agentId: string | 'all') => void
  setDepartmentFilter: (departmentId: string | 'all') => void
  setChannelFilter: (channel: 'all' | 'whatsapp' | 'instagram') => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  filter: 'pending',
  searchQuery: '',
  agentFilter: 'all',
  departmentFilter: 'all',
  channelFilter: 'all',
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAgentFilter: (agentId) => set({ agentFilter: agentId }),
  setDepartmentFilter: (departmentId) => set({ departmentFilter: departmentId }),
  setChannelFilter: (channel) => set({ channelFilter: channel }),
}))
