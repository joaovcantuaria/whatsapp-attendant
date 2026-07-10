'use client'

import { useState } from 'react'
import { useConversations } from '@/hooks/use-conversations'
import { useConversationStore } from '@/store/conversation-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConversationItem } from './conversation-item'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search } from 'lucide-react'
import { ConversationStatus } from '@/types'

export function ConversationList() {
  const { filter, setFilter, searchQuery, setSearchQuery } = useConversationStore()
  const { conversations, isLoading } = useConversations(filter)

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true
    const contactName = conv.contact?.name || ''
    const contactPhone = conv.contact?.phone || ''
    return (
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contactPhone.includes(searchQuery)
    )
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <h2 className="font-semibold text-lg">Conversas</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as ConversationStatus | 'all')}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1 text-xs">Todas</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1 text-xs">Pendentes</TabsTrigger>
            <TabsTrigger value="open" className="flex-1 text-xs">Abertas</TabsTrigger>
            <TabsTrigger value="closed" className="flex-1 text-xs">Fechadas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhuma conversa encontrada
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
