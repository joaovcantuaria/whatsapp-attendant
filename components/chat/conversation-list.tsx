'use client'

import { useConversations } from '@/hooks/use-conversations'
import { useConversationStore } from '@/store/conversation-store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationItem } from './conversation-item'
import { AgentFilter } from './agent-filter'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MessageCircle } from 'lucide-react'
import { ConversationStatus } from '@/types'

export function ConversationList() {
  const { filter, setFilter, searchQuery, setSearchQuery, agentFilter } = useConversationStore()
  const { conversations, isLoading } = useConversations(filter)

  const filteredConversations = conversations.filter((conv) => {
    if (agentFilter !== 'all' && conv.agent_id !== agentFilter) return false
    if (searchQuery) {
      const contactName = conv.contact?.name || ''
      const contactPhone = conv.contact?.phone || ''
      if (
        !contactName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !contactPhone.includes(searchQuery)
      ) return false
    }
    return true
  })

  const tabs = [
    { value: 'all', label: 'Todas', count: conversations.length },
    { value: 'pending', label: 'Pendentes', count: conversations.filter(c => c.status === 'pending').length },
    { value: 'open', label: 'Abertas', count: conversations.filter(c => c.status === 'open').length },
    { value: 'closed', label: 'Fechadas', count: conversations.filter(c => c.status === 'closed').length },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Conversas</h2>
          <Badge variant="secondary" className="text-[10px] px-1.5">{filteredConversations.length}</Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Agent Filter */}
        <AgentFilter />

        {/* Tabs */}
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as ConversationStatus | 'all')}
              className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                filter === tab.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-2.5 p-2">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">Nenhuma conversa</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
