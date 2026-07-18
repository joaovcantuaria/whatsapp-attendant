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
import { EmojiPicker } from './emoji-picker'
import { cn } from '@/lib/utils'
import {
  Send,
  Paperclip,
  Image,
  FileText,
  Mic,
  MicOff,
  Smile,
  LayoutTemplate,
  Loader2,
  StickyNote,
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
  const [isNoteMode, setIsNoteMode] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [quickReplyQuery, setQuickReplyQuery] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isSendingAudio, setIsSendingAudio] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { sendMessage, isLoading } = useSendMessage()
  const { toast } = useToast()

  const phone = conversation.contact?.phone || ''

  // Gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudioMessage(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch {
      toast({
        title: 'Erro ao acessar microfone',
        description: 'Permita o acesso ao microfone no navegador',
        variant: 'destructive',
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
      audioChunksRef.current = []
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }

  const sendAudioMessage = async (audioBlob: Blob) => {
    setIsSendingAudio(true)
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, `audio_${Date.now()}.webm`)
      formData.append('conversationId', conversation.id)
      formData.append('phone', phone)
      formData.append('type', 'audio')

      const res = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        if (onOptimisticSend) {
          onOptimisticSend({
            content: null,
            sender_type: 'agent',
            message_type: 'audio',
          })
        }
      } else {
        const data = await res.json()
        toast({
          title: 'Erro ao enviar áudio',
          description: data.error || 'Tente novamente',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao enviar áudio',
        variant: 'destructive',
      })
    } finally {
      setIsSendingAudio(false)
      setRecordingTime(0)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current)
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleSend = async () => {
    if (!text.trim()) return
    if (!isNoteMode && !phone) return

    const messageText = text.trim()
    setText('') // Limpa input imediatamente

    if (isNoteMode) {
      // Enviar como nota interna
      if (onOptimisticSend) {
        onOptimisticSend({
          content: messageText,
          sender_type: 'agent',
          message_type: 'internal_note',
          direction: 'internal',
          type: 'internal_note',
        })
      }

      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: messageText,
          }),
        })

        if (!res.ok) {
          toast({
            title: 'Erro ao salvar nota',
            description: 'Tente novamente',
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Erro ao salvar nota',
          variant: 'destructive',
        })
      }
      return
    }

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

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const handleMediaUpload = async (type: 'image' | 'document' | 'audio') => {
    const input = document.createElement('input')
    input.type = 'file'
    
    switch (type) {
      case 'image':
        input.accept = 'image/jpeg,image/png,image/webp'
        break
      case 'document':
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
        break
      case 'audio':
        input.accept = 'audio/ogg,audio/mp3,audio/mpeg,audio/amr,audio/aac'
        break
    }

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Validar tamanho (Meta permite até 16MB para documentos, 5MB para imagens)
      const maxSize = type === 'document' ? 16 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: `Tamanho máximo: ${type === 'document' ? '16MB' : '5MB'}`,
          variant: 'destructive',
        })
        return
      }

      toast({ title: 'Enviando...', description: file.name })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversationId', conversation.id)
      formData.append('phone', phone)
      formData.append('type', type)
      if (text.trim()) {
        formData.append('caption', text.trim())
        setText('')
      }

      try {
        const res = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          toast({ title: 'Mídia enviada!' })
        } else {
          const data = await res.json()
          toast({
            title: 'Erro ao enviar mídia',
            description: data.error || 'Tente novamente',
            variant: 'destructive',
          })
        }
      } catch {
        toast({
          title: 'Erro de conexão',
          description: 'Não foi possível enviar a mídia',
          variant: 'destructive',
        })
      }
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
      {/* Note Mode Indicator */}
      {isNoteMode && (
        <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2">
          <StickyNote className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">Modo nota interna — não será enviada ao cliente</span>
        </div>
      )}

      {/* Quick Replies Dropdown */}
      {showQuickReplies && (
        <QuickReplyPicker
          query={quickReplyQuery}
          onSelect={handleQuickReplySelect}
          onClose={() => setShowQuickReplies(false)}
        />
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
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
              Áudio (arquivo)
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

        {/* Emoji Button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Smile className="h-5 w-5" />
        </Button>

        {/* Note Mode Toggle - only on desktop */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'shrink-0 hidden md:flex',
            isNoteMode && 'bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800'
          )}
          onClick={() => setIsNoteMode(!isNoteMode)}
          title={isNoteMode ? 'Desativar modo nota' : 'Nota interna'}
        >
          <StickyNote className="h-5 w-5" />
        </Button>

        {/* Recording State or Text Input */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 bg-red-50 border border-red-200 rounded-md">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-medium text-red-600">{formatTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-[10px] text-red-500 font-medium">✕</button>
            <Button size="sm" onClick={stopRecording} className="h-6 text-[10px] bg-red-500 hover:bg-red-600 px-2">
              <Send className="h-3 w-3" />
            </Button>
          </div>
        ) : isSendingAudio ? (
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border rounded-md">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="text-sm text-slate-500">Enviando áudio...</span>
          </div>
        ) : (
          <>
            {/* Text Input */}
            <Input
              ref={inputRef}
              placeholder={isNoteMode ? 'Nota interna...' : 'Digite uma mensagem...'}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className={cn(
                'flex-1 text-[16px] md:text-sm',
                isNoteMode && 'bg-amber-50 border-amber-200 placeholder:text-amber-500'
              )}
            />

            {/* Send or Mic Button */}
            {text.trim() ? (
              <Button
                onClick={handleSend}
                disabled={!text.trim()}
                size="icon"
                className={cn(
                  'shrink-0',
                  isNoteMode
                    ? 'bg-amber-500 hover:bg-amber-600'
                    : 'bg-[#F26522] hover:bg-[#d4561c]'
                )}
              >
                {isNoteMode ? <StickyNote className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                variant="ghost"
                size="icon"
                className="shrink-0 text-slate-500 hover:text-[#F26522]"
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
