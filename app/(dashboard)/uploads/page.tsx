'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload,
  Trash2,
  Copy,
  Image as ImageIcon,
  FileText,
  Video,
  Check,
  Loader2,
} from 'lucide-react'

interface UploadedFile {
  name: string
  url: string
  size: number
  type: string
  created_at?: string
}

export default function UploadsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/uploads')
      if (res.ok) {
        setFiles(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        toast({ title: 'Upload concluído!' })
        fetchFiles()
      } else {
        toast({ title: data.error || 'Erro no upload', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro de conexão', variant: 'destructive' })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      const res = await fetch('/api/uploads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })

      if (res.ok) {
        toast({ title: 'Arquivo removido' })
        setFiles((prev) => prev.filter((f) => f.name !== filename))
      } else {
        toast({ title: 'Erro ao remover', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    toast({ title: 'URL copiada!' })
    setTimeout(() => setCopiedUrl(null), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />
    if (type.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />
    return <FileText className="h-5 w-5 text-orange-500" />
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Uploads</h1>
            <p className="text-xs text-slate-500">
              Suba imagens para usar nos templates de WhatsApp. Copie a URL e use nos envios.
            </p>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,application/pdf"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isUploading ? 'Enviando...' : 'Fazer Upload'}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            <strong>Como usar:</strong> Suba a imagem aqui, copie a URL gerada e use nos templates de campanha ou no endpoint de agendamento. A URL é pública e permanente.
          </p>
        </div>

        {/* Files List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <Upload className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm text-slate-500 mb-2">Nenhum arquivo enviado</p>
            <p className="text-xs text-slate-400 mb-4">
              Suba imagens JPG, PNG, WebP, GIF, vídeos MP4 ou PDFs
            </p>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Fazer Upload
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <Card key={file.name} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Preview ou ícone */}
                    <div className="shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="h-14 w-14 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center">
                          {getFileIcon(file.type)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px]">
                          {file.type.split('/')[1]?.toUpperCase()}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{formatSize(file.size)}</span>
                      </div>
                      {/* URL */}
                      <div className="flex items-center gap-1 mt-2">
                        <Input
                          value={file.url}
                          readOnly
                          className="h-7 text-[10px] bg-slate-50 font-mono"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={() => copyUrl(file.url)}
                        >
                          {copiedUrl === file.url ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(file.name)}
                      className="text-slate-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
