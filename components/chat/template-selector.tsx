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

  const approvedTemplates = templates.filter((t) => t.status === 'approved')
  const selected = approvedTemplates.find((t) => t.id === selectedTemplate)

  const handleSend = async () => {
    if (!selected || !conversation.contact?.phone) return

    const { buildTemplateComponents } = await import('@/lib/template-utils')
    const components = buildTemplateComponents(selected, variables)

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
                    onClick={() => setSelectedTemplate(template.id)}
                    className="w-full p-3 border rounded-lg text-left hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{template.name}</span>
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
              <p className="text-sm whitespace-pre-wrap">{selected.body}</p>
              {selected.footer && (
                <p className="text-xs text-muted-foreground mt-2">{selected.footer}</p>
              )}
            </div>

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
