'use client'

import { Message } from '@/types'
import { cn, formatMessageTime } from '@/lib/utils'
import { Check, CheckCheck, Clock, XCircle, FileText, MapPin, Download } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

function getMediaSrc(mediaUrl: string): string {
  if (mediaUrl.startsWith('data:')) return mediaUrl
  return `/api/media?mediaUrl=${encodeURIComponent(mediaUrl)}`
}

function DownloadButton({ mediaUrl, filename, type }: { mediaUrl: string; filename?: string; type: string }) {
  const handleDownload = async () => {
    try {
      const src = getMediaSrc(mediaUrl)
      const response = await fetch(src)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // Determinar extensão pelo tipo
      const extensions: Record<string, string> = {
        image: '.jpg',
        audio: '.mp3',
        video: '.mp4',
        sticker: '.webp',
        document: '',
      }
      const ext = extensions[type] || ''
      a.download = filename || `${type}_${Date.now()}${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: abrir em nova aba
      window.open(getMediaSrc(mediaUrl), '_blank')
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
      title="Baixar"
    >
      <Download className="h-3.5 w-3.5 text-white" />
    </button>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'

  const StatusIcon = () => {
    if (!isOutbound) return null
    switch (message.status) {
      case 'sent':
        return <Check className="h-3.5 w-3.5 text-muted-foreground" />
      case 'delivered':
        return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
      case 'read':
        return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
      case 'failed':
        return <XCircle className="h-3.5 w-3.5 text-destructive" />
      default:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="relative group">
                <img
                  src={getMediaSrc(message.media_url)}
                  alt="Imagem"
                  className="rounded-md max-w-[280px] max-h-[300px] object-cover cursor-pointer"
                  loading="lazy"
                  onClick={() => window.open(getMediaSrc(message.media_url!), '_blank')}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement?.insertAdjacentHTML(
                      'afterbegin',
                      '<div class="flex items-center gap-2 p-3 rounded bg-black/5 text-xs text-muted-foreground"><span>📷 Imagem indisponível</span></div>'
                    )
                  }}
                />
                <DownloadButton mediaUrl={message.media_url} type="image" />
              </div>
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
          <div className="space-y-1.5">
            {message.media_url ? (
              <div className="relative group">
                <audio
                  controls
                  className="max-w-[250px] h-8"
                  src={getMediaSrc(message.media_url)}
                >
                  Seu navegador não suporta áudio.
                </audio>
                <button
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = getMediaSrc(message.media_url!)
                    a.download = `audio_${Date.now()}.mp3`
                    a.target = '_blank'
                    a.click()
                  }}
                  className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Baixar áudio
                </button>
              </div>
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
              <div className="relative group">
                <video
                  controls
                  className="rounded-md max-w-[280px] max-h-[300px]"
                  src={getMediaSrc(message.media_url)}
                />
                <DownloadButton mediaUrl={message.media_url} type="video" />
              </div>
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
          <div className="relative group">
            <a
              href={message.media_url ? getMediaSrc(message.media_url) : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-black/5 hover:bg-black/10 transition-colors"
            >
              <FileText className="h-8 w-8 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {message.media_filename || 'Documento'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {message.media_mime_type || 'Arquivo'}
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          </div>
        )

      case 'sticker':
        return (
          <div className="relative group">
            {message.media_url ? (
              <>
                <img
                  src={getMediaSrc(message.media_url)}
                  alt="Sticker"
                  className="w-32 h-32 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    target.parentElement?.insertAdjacentHTML(
                      'afterbegin',
                      '<span class="text-2xl">🏷️</span>'
                    )
                  }}
                />
                <DownloadButton mediaUrl={message.media_url} type="sticker" />
              </>
            ) : (
              <span className="text-2xl">🏷️</span>
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

      case 'button':
        return (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground italic">Resposta de botão:</p>
            <p className="text-sm font-medium">{message.content}</p>
          </div>
        )

      case 'interactive':
        return (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground italic">Resposta interativa:</p>
            <p className="text-sm font-medium">{message.content}</p>
          </div>
        )

      case 'reaction':
        return (
          <div className="text-2xl">{message.content}</div>
        )

      default:
        return <p className="text-sm text-muted-foreground italic">[{message.type}]</p>
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
