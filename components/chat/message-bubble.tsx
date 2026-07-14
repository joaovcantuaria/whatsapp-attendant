'use client'

import { Message } from '@/types'
import { cn, formatMessageTime } from '@/lib/utils'
import { Check, CheckCheck, Clock, XCircle, FileText, MapPin } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  const StatusIcon = () => {
    if (!isOutbound) return null
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />
    }
  }

  const renderContent = () => {
    switch (message.type) {
      case 'text':
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

      case 'image':
        return (
          <div className="space-y-1">
            {message.media_url ? (
              <img
                src={`/api/media?mediaUrl=${encodeURIComponent(message.media_url)}`}
                alt="Imagem"
                className="rounded-md max-w-[280px] max-h-[300px] object-cover cursor-pointer"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement?.insertAdjacentHTML(
                    'afterbegin',
                    '<div class="flex items-center gap-2 p-3 rounded bg-black/5 text-xs text-muted-foreground"><span>📷 Imagem indisponível</span></div>'
                  )
                }}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 rounded bg-black/5">
                <span className="text-xs text-muted-foreground">📷 Imagem</span>
              </div>
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )

      case 'audio':
        return (
          <div className="flex items-center gap-2">
            {message.media_url ? (
              <audio
                controls
                className="max-w-[250px] h-8"
                src={`/api/media?mediaUrl=${encodeURIComponent(message.media_url)}`}
              >
                Seu navegador não suporta áudio.
              </audio>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded bg-black/5">
                <span className="text-xs text-muted-foreground">🎵 Áudio indisponível</span>
              </div>
            )}
          </div>
        )

      case 'video':
        return (
          <div className="space-y-1">
            {message.media_url ? (
              <video
                controls
                className="rounded-md max-w-[280px] max-h-[300px]"
                src={`/api/media?mediaUrl=${encodeURIComponent(message.media_url)}`}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 rounded bg-black/5">
                <span className="text-xs text-muted-foreground">🎬 Vídeo indisponível</span>
              </div>
            )}
            {message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        )

      case 'document':
        return (
          <a
            href={message.media_url ? `/api/media?mediaUrl=${encodeURIComponent(message.media_url)}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded bg-black/5 hover:bg-black/10 transition-colors"
          >
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {message.media_filename || 'Documento'}
              </p>
              <p className="text-xs text-muted-foreground">
                {message.media_mime_type || 'Arquivo'}
              </p>
            </div>
          </a>
        )

      case 'sticker':
        return (
          <div>
            {message.media_url && (
              <img
                src={`/api/media?mediaUrl=${encodeURIComponent(message.media_url)}`}
                alt="Sticker"
                className="w-32 h-32 object-contain"
                loading="lazy"
              />
            )}
          </div>
        )

      case 'location':
        const location = message.content ? JSON.parse(message.content) : null
        if (!location) return null
        return (
          <div className="flex items-center gap-2 p-2">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            <div>
              {location.name && <p className="text-sm font-medium">{location.name}</p>}
              {location.address && <p className="text-xs text-muted-foreground">{location.address}</p>}
              <p className="text-xs text-muted-foreground">
                {location.latitude}, {location.longitude}
              </p>
            </div>
          </div>
        )

      case 'template':
        return (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground italic">Template: {message.template_name}</p>
            {message.content && <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
          </div>
        )

      default:
        return <p className="text-sm text-muted-foreground italic">[Tipo não suportado]</p>
    }
  }

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
          isOutbound
            ? 'bg-whatsapp-light text-foreground rounded-br-none'
            : 'bg-card border rounded-bl-none'
        )}
      >
        {renderContent()}
        <div className={cn('flex items-center gap-1 mt-1', isOutbound ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          <StatusIcon />
        </div>
      </div>
    </div>
  )
}
