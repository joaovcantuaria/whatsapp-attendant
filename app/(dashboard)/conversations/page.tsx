'use client'

import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { ContactPanelV2 } from '@/components/chat/contact-panel-v2'
import { ConversationTabs } from '@/components/chat/conversation-tabs'
import { ConnectionBanner } from '@/components/chat/connection-banner'
import { useConversationStore } from '@/store/conversation-store'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { useDesktopNotifications } from '@/hooks/use-desktop-notifications'
import { useState } from 'react'
import { MessageCircle, PanelRightClose, PanelRightOpen, ArrowLeft } from 'lucide-react'

export default function ConversationsPage() {
  const { selectedConversation, setSelectedConversation } = useConversationStore()
  const [panelOpen, setPanelOpen] = useState(true)

  // Notificação sonora para novas mensagens
  useNotificationSound()
  // Notificações desktop (browser push)
  useDesktopNotifications()

  return (
    <div className="flex flex-col h-full">
      {/* Connection Banner */}
      <ConnectionBanner />

      {/* Top: Conversation Tabs - hidden on mobile when chat is open */}
      <div className={`${selectedConversation ? 'hidden md:block' : ''}`}>
        <ConversationTabs />
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Lista de Conversas - full width on mobile, fixed width on desktop */}
        <div className={`
          w-full md:w-[300px] md:border-r md:border-slate-200 md:flex-shrink-0
          ${selectedConversation ? 'hidden md:block' : 'block'}
        `}>
          <ConversationList />
        </div>

        {/* Chat - full screen on mobile (overlays the list), flex on desktop */}
        <div className={`
          absolute inset-0 md:relative md:inset-auto
          flex-1 flex flex-col min-w-0
          ${selectedConversation ? 'block' : 'hidden md:flex'}
          bg-white z-10 md:z-auto
        `}>
          {selectedConversation ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden h-11 border-b flex items-center px-3 bg-white">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="text-sm font-medium">Conversas</span>
                </button>
              </div>
              <ChatWindow conversation={selectedConversation} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50/50">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-600">Selecione uma conversa</p>
                <p className="text-xs text-slate-400 mt-1">Escolha um contato para iniciar</p>
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral - hidden on mobile */}
        {selectedConversation && (
          <div className="hidden lg:block">
            {panelOpen ? (
              <div className="w-[280px] border-l border-slate-200 flex-shrink-0 relative">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="absolute top-2 left-2 z-10 p-1 rounded hover:bg-slate-100 text-slate-400"
                  title="Fechar painel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
                <ContactPanelV2 conversation={selectedConversation} />
              </div>
            ) : (
              <div className="w-10 border-l border-slate-200 flex-shrink-0 flex items-start justify-center pt-3">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-400"
                  title="Abrir painel"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
