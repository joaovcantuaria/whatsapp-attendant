'use client'

import { useConversationStore } from '@/store/conversation-store'
import { X, Plus } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { Conversation } from '@/types'
import { useState, useEffect } from 'react'

export function ConversationTabs() {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const [openTabs, setOpenTabs] = useState<Conversation[]>([])

  // Add conversation to tabs when selected
  useEffect(() => {
    if (selectedConversation) {
      setOpenTabs((prev) => {
        const exists = prev.find((t) => t.id === selectedConversation.id)
        if (exists) return prev
        return [...prev, selectedConversation]
      })
    }
  }, [selectedConversation])

  function closeTab(e: React.MouseEvent, convId: string) {
    e.stopPropagation()
    setOpenTabs((prev) => prev.filter((t) => t.id !== convId))
    if (selectedConversation?.id === convId) {
      const remaining = openTabs.filter((t) => t.id !== convId)
      setSelectedConversation(remaining[remaining.length - 1] || null)
    }
  }

  if (openTabs.length === 0) return null

  return (
    <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-1 gap-0.5 overflow-x-auto scrollbar-hide">
      {openTabs.map((conv) => {
        const isActive = selectedConversation?.id === conv.id
        const name = conv.contact?.name || conv.contact?.phone || 'Contato'
        const initials = getInitials(name)

        return (
          <button
            key={conv.id}
            onClick={() => setSelectedConversation(conv)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap max-w-[160px] group ${
              isActive
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-[#F26522]/10 flex items-center justify-center text-[9px] font-bold text-[#F26522] shrink-0">
              {initials}
            </span>
            <span className="truncate">{name.split(' ')[0]}</span>
            {conv.unread_count > 0 && !isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#F26522] shrink-0" />
            )}
            <span
              onClick={(e) => closeTab(e, conv.id)}
              className="ml-auto p-0.5 rounded hover:bg-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        )
      })}
    </div>
  )
}
