import { create } from 'zustand'
import { Conversation, ConversationStatus } from '@/types'

interface ConversationStore {
  selectedConversation: Conversation | null
  filter: ConversationStatus | 'all'
  searchQuery: string
  setSelectedConversation: (conversation: Conversation | null) => void
  setFilter: (filter: ConversationStatus | 'all') => void
  setSearchQuery: (query: string) => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  filter: 'all',
  searchQuery: '',
  setSelectedConversation: (conversation) => set({ selectedConversation: conversation }),
  setFilter: (filter) => set({ filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}))
