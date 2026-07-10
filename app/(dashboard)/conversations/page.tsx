'use client'

import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { ContactPanel } from '@/components/chat/contact-panel'
import { useConversationStore } from '@/store/conversation-store'

export default function ConversationsPage() {
  const { selectedConversation } = useConversationStore()

  return (
    <div className="flex h-full">
      {/* Coluna 1 - Lista de Conversas */}
      <div className="w-80 border-r flex-shrink-0">
        <ConversationList />
      </div>

      {/* Coluna 2 - Chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow conversation={selectedConversation} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa à esquerda para iniciar o atendimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Coluna 3 - Painel do Contato */}
      {selectedConversation && (
        <div className="w-80 border-l flex-shrink-0 hidden xl:block">
          <ContactPanel conversation={selectedConversation} />
        </div>
      )}
    </div>
  )
}
