'use client'

import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { ContactPanel } from '@/components/chat/contact-panel'
import { useConversationStore } from '@/store/conversation-store'
import { MessageCircle } from 'lucide-react'

export default function ConversationsPage() {
  const { selectedConversation } = useConversationStore()

  return (
    <div className="flex h-full">
      {/* Lista de Conversas */}
      <div className="w-80 border-r border-slate-200 flex-shrink-0">
        <ConversationList />
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-600">Selecione uma conversa</p>
              <p className="text-xs text-slate-400 mt-1">Escolha uma conversa para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel do Contato */}
      {selectedConversation && (
        <div className="w-72 border-l border-slate-200 flex-shrink-0 hidden xl:block">
          <ContactPanel conversation={selectedConversation} />
        </div>
      )}
    </div>
  )
}
