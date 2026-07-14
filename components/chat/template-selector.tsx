'use client'

import { useState } from 'react'
import { Conversation } from '@/types'
import { useTemplates } from '@/hooks/use-templates'
import { useSendMessage } from '@/hooks/use-send-message'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { ImageIcon, Video, FileText } from 'lucide-react'

interface TemplateSelectorProps {
  conversation: Conversation
  onClose: () => void
}

export function TemplateSelector({ conversation, onClose }: TemplateSelectorProps) {
  const { templates, isLoading } = useTemplates()
  const { sendMessage } = useSendMessage()
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [headerMediaUrl, setHeaderMediaUrl] = useState('')

  const approvedTemplates = templates.filter((t) => t.status === 'approved')
  const selected = approvedTemplates.find((t) => t.id === selectedTemplate)

  // Verifica se o header é de mídia (precisa de URL)
  const needsHeaderMedia = selected?.header_type &&
    ['image', 'video', 'document'].includes(selected.header_type.toLowerCase())

  const handleSend = async () => {
    if (!selected || !conversation.contact?.phone) return

    // Validar URL de mídia se necessário
    if (needsHeaderMedia && !headerMediaUrl) {
      toast({
        title: 'URL da mídia obrigatória',
        description: `Este template requer uma URL de ${selected.header_type === 'image' ? 'imagem' : selected.header_type === 'video' ? 'vídeo' : 'documento'} no header.`,
        variant: 'destructive',
      })
      return
    }

    const { buildTemplateComponents } = await import('@/lib/template-utils')
    const components = buildTemplateComponents(
      selected,
      variables,
      needsHeaderMedia ? headerMediaUrl : undefined
    )

    const result = await sendMessage({
      conversationId: conversation.id,
      phone: conversation.contact.phone,
      type: 'template',
      content: selected.body,
      templateName: selected.name,
      templateLanguage: selected.language,
      templateComponents: components.length > 0 ? components : undefined,
    })

    if (result) {
      toast({ title: 'Template enviado com sucesso' })
      onClose()
    } else {
      toast({
        title: 'Erro ao enviar template',
        variant: 'destructive',
      })
    }
  }

  // Extrair variáveis do body do template (ex: {{1}}, {{2}})
  const extractVariables = (body: string): string[] => {
    const matches = body.match(/\{\{(\d+)\}\}/g)
    if (!matches) return []
    return Array.from(new Set(matches))
  }

  const getMediaIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'image': return <ImageIcon className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'document': return <FileText className="h-4 w-4" />
      default: return null
    }
  }

  const getMediaLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'image': return 'URL da Imagem'
      case 'video': return 'URL do Vídeo'
      case 'document': return 'URL do Documento'
      default: return 'URL da Mídia'
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Template</DialogTitle>
          <DialogDescription>
            Selecione um template aprovado para enviar
          </DialogDescription>
        </DialogHeader>

        {!selectedTemplate ? (
          <ScrollArea className="max-h-96">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : approvedTemplates.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum template aprovado disponível
              </p>
            ) : (
              <div className="space-y-2">
                {approvedTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template.id)
                      setHeaderMediaUrl('')
                      setVariables({})
                    }}
                    className="w-full p-3 border rounded-lg text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.header_type && ['image', 'video', 'document'].includes(template.header_type.toLowerCase()) && (
                          <Badge variant="outline" className="text-[9px] gap-1">
                            {getMediaIcon(template.header_type)}
                            {template.header_type}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.language}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.body}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : selected ? (
          <div className="space-y-4">
            {/* Preview */}
            <div className="p-3 bg-whatsapp-light rounded-lg">
              <p className="text-sm font-medium mb-1">{selected.name}</p>
              {selected.header_type && (
                <p className="text-[10px] text-muted-foreground mb-1">
                  Header: {selected.header_type.toUpperCase()}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
              {selected.footer && (
                <p className="text-xs text-muted-foreground mt-2">{selected.footer}</p>
              )}
            </div>

            {/* Header Media URL */}
            {needsHeaderMedia && (
              <div className="space-y-1">
                <Label className="text-sm flex items-center gap-2">
                  {getMediaIcon(selected.header_type!)}
                  {getMediaLabel(selected.header_type!)}
                </Label>
                <Input
                  placeholder={`https://exemplo.com/${selected.header_type === 'image' ? 'imagem.jpg' : selected.header_type === 'video' ? 'video.mp4' : 'arquivo.pdf'}`}
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Insira uma URL pública acessível para o {selected.header_type === 'image' ? 'a imagem' : selected.header_type === 'video' ? 'o vídeo' : 'o documento'} do header
                </p>
              </div>
            )}

            {/* Variables */}
            {extractVariables(selected.body).map((variable) => (
              <div key={variable} className="space-y-1">
                <Label className="text-sm">Variável {variable}</Label>
                <Input
                  placeholder={`Valor para ${variable}`}
                  value={variables[variable] || ''}
                  onChange={(e) =>
                    setVariables((prev) => ({ ...prev, [variable]: e.target.value }))
                  }
                />
              </div>
            ))}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Voltar
              </Button>
              <Button onClick={handleSend}>Enviar Template</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
