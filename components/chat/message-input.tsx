'use client'

import { useState, useRef, useEffect } from 'react'
import { Conversation, WindowStatus } from '@/types'
import { useSendMessage } from '@/hooks/use-send-message'
import { useQuickReplies } from '@/hooks/use-quick-replies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { QuickReplyPicker } from './quick-reply-picker'
import { TemplateSelector } from './template-selector'
import {
  Send,
  Paperclip,
  Image,
  FileText,
  Mic,
  Smile,
  LayoutTemplate,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageInputProps {
  conversation: Conversation
  windowStatus: WindowStatus
  onOptimisticSend?: (message: Partial<any>) => void
}

export function MessageInput({ conversation, windowStatus, onOptimisticSend }: MessageInputProps) {
  const [text, setText] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [quickReplyQuery, setQuickReplyQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { sendMessage, isLoading } = useSendMessage()
  const { toast } = useToast()

  const phone = conversation.contact?.phone || ''

  const handleSend = async () => {
    if (!text.trim() || !phone) return

    const messageText = text.trim()
    setText('') // Limpa input imediatamente

    // Optimistic: mostra na tela antes do servidor responder
    if (onOptimisticSend) {
      onOptimisticSend({
        content: messageText,
        sender_type: 'agent',
        message_type: 'text',
      })
    }

    // Envia pro servidor em background
    const result = await sendMessage({
      conversationId: conversation.id,
      phone,
      type: 'text',
      content: messageText,
    })

    if (!result) {
      toast({
        title: 'Erro ao enviar',
        description: 'Mensagem pode não ter sido entregue',
        variant: 'destructive',
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setText(value)

    // Detectar atalho de respostas rápidas
    if (value.startsWith('/')) {
      setQuickReplyQuery(value.slice(1))
      setShowQuickReplies(true)
    } else {
      setShowQuickReplies(false)
    }
  }

  const handleQuickReplySelect = (content: string) => {
    setText(content)
    setShowQuickReplies(false)
    inputRef.current?.focus()
  }

  const handleMediaUpload = async (type: 'image' | 'document' | 'audio') => {
    const input = document.createElement('input')
    input.type = 'file'
    
    switch (type) {
      case 'image':
        input.accept = 'image/*'
        break
      case 'document':
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx'
        break
      case 'audio':
        input.accept = 'audio/*'
        break
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Para simplificar, usamos URL.createObjectURL localmente
      // Em produção, faria upload para Supabase Storage e usaria a URL pública
      toast({
        title: 'Upload',
        description: 'Para enviar mídias, configure o Supabase Storage para upload de arquivos.',
      })
    }

    input.click()
  }

  // Se a janela está fechada, só permite templates
  if (windowStatus === 'closed') {
    return (
      <div className="border-t p-4">
        <div className="flex items-center gap-2 justify-center">
          <p className="text-sm text-muted-foreground">Janela de 24h expirada.</p>
          <Button size="sm" onClick={() => setShowTemplateSelector(true)}>
            <LayoutTemplate className="h-4 w-4 mr-1" />
            Enviar Template
          </Button>
        </div>
        {showTemplateSelector && (
          <TemplateSelector
            conversation={conversation}
            onClose={() => setShowTemplateSelector(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="border-t p-3 relative">
      {/* Quick Replies Dropdown */}
      {showQuickReplies && (
        <QuickReplyPicker
          query={quickReplyQuery}
          onSelect={handleQuickReplySelect}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <TemplateSelector
          conversation={conversation}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      <div className="flex items-center gap-2">
        {/* Attachments */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleMediaUpload('image')}>
              <Image className="mr-2 h-4 w-4" />
              Imagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMediaUpload('document')}>
              <FileText className="mr-2 h-4 w-4" />
              Documento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMediaUpload('audio')}>
              <Mic className="mr-2 h-4 w-4" />
              Áudio
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Template Button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setShowTemplateSelector(true)}
        >
          <LayoutTemplate className="h-5 w-5" />
        </Button>

        {/* Text Input */}
        <Input
          ref={inputRef}
          placeholder="Digite uma mensagem... (/ para respostas rápidas)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="flex-1"
        />

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!text.trim()}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
