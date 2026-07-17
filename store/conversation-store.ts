import { create } from 'zustand'
import { Conversation, ConversationStatus } from '@/types'

interface ConversationStore {
  selectedConversation: Conversation | null
  filter: ConversationStatus | 'all'
  searchQuery: string
  agentFilter: string | 'all'
  channelFilter: 'all' | 'whatsapp' | 'instagram'
  setSelectedConversation: (conversation: Conversation | null) => void
  setFilter: (filter: ConversationStatus | 'all') => void
  setSearchQuery: (query: string) => void
  setAgentFilter: (agentId: string | 'all') => void
  setChannelFilter: (channel: 'all' | 'whatsapp' | 'instagram') => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  filter: 'all',
  searchQuery: '',
  agentFilter: 'all',
  channelFilter: 'all',
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setAgentFilter: (agentId) => set({ agentFilter: agentId }),
  setChannelFilter: (channel) => set({ channelFilter: channel }),
}))
