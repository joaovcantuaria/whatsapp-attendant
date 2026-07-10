import { create } from 'zustand'
import { Agent } from '@/types'

interface AuthStore {
  agent: Agent | null
  isLoading: boolean
  setAgent: (agent: Agent | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  agent: null,
  isLoading: true,
  setAgent: (agent) => set({ agent }),
  setIsLoading: (isLoading) => set({ isLoading }),
}))
