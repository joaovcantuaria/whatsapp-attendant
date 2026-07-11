'use client'

import { useState } from 'react'
import { Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase'
import { formatPhone, getInitials } from '@/lib/utils'
import { Mail, Phone, Tag, StickyNote, Send, Target } from 'lucide-react'

interface ContactPanelProps {
  conversation: Conversation
}

export function ContactPanel({ conversation }: ContactPanelProps) {
  const contact = conversation.contact
  const { agent } = useAuthStore()
  const supabase = createClient()
  const { toast } = useToast()
  const [noteContent, setNoteContent] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [showDealDialog, setShowDealDialog] = useState(false)
  const [dealTitle, setDealTitle] = useState('')
  const [dealValue, setDealValue] = useState('')
  const [isCreatingDeal, setIsCreatingDeal] = useState(false)

  const handleCreateDeal = async () => {
    if (!dealTitle.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' })
      return
    }
    setIsCreatingDeal(true)
    try {
      // Buscar pipeline e primeiro stage
      const pipelineRes = await fetch('/api/crm/pipeline')
      if (!pipelineRes.ok) throw new Error('Erro ao buscar pipeline')
      const pipelineData = await pipelineRes.json()
      const firstStage = pipelineData.stages?.[0]

      if (!firstStage || !pipelineData.pipeline) {
        toast({ title: 'Pipeline não configurado', variant: 'destructive' })
        return
      }

      const response = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dealTitle,
          value: parseFloat(dealValue) || 0,
          contact_id: contact?.id || null,
          stage_id: firstStage.id,
          pipeline_id: pipelineData.pipeline.id,
        }),
      })

      if (response.ok) {
        toast({ title: 'Negociação criada no CRM!' })
        setShowDealDialog(false)
        setDealTitle('')
        setDealValue('')
      } else {
        toast({ title: 'Erro ao criar negociação', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Erro ao criar negociação', variant: 'destructive' })
    } finally {
      setIsCreatingDeal(false)
    }
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !agent) return
    setIsSavingNote(true)

    try {
      const { error } = await supabase.from('conversation_notes').insert({
        conversation_id: conversation.id,
        agent_id: agent.id,
        content: noteContent.trim(),
      })

      if (error) throw error

      toast({ title: 'Nota salva' })
      setNoteContent('')
    } catch (error) {
      toast({ title: 'Erro ao salvar nota', variant: 'destructive' })
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Contact Info */}
        <div className="text-center space-y-3">
          <Avatar className="h-16 w-16 mx-auto">
            <AvatarImage src={contact?.profile_picture || ''} />
            <AvatarFallback className="text-lg">
              {contact?.name ? getInitials(contact.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{contact?.name || 'Desconhecido'}</h3>
            <p className="text-sm text-muted-foreground">
              {contact?.phone ? formatPhone(contact.phone) : ''}
            </p>
          </div>
        </div>

        <Separator />

        {/* Contact Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Informações</h4>
          
          {contact?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formatPhone(contact.phone)}</span>
            </div>
          )}
          
          {contact?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contact.email}</span>
            </div>
          )}

          {contact?.tags && contact.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Tabs: Notes */}
        <Tabs defaultValue="notes">
          <TabsList className="w-full">
            <TabsTrigger value="notes" className="flex-1">Notas</TabsTrigger>
            <TabsTrigger value="info" className="flex-1">Detalhes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota interna..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={handleSaveNote}
              disabled={!noteContent.trim() || isSavingNote}
              className="w-full"
            >
              <StickyNote className="h-4 w-4 mr-1" />
              Salvar Nota
            </Button>
          </TabsContent>

          <TabsContent value="info" className="mt-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={conversation.status === 'open' ? 'success' : 'secondary'}>
                  {conversation.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agente</span>
                <span>{conversation.agent?.name || 'Não atribuído'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal</span>
                <span>{conversation.channel}</span>
              </div>
              {contact?.notes && (
                <div className="mt-3">
                  <span className="text-muted-foreground block mb-1">Observações</span>
                  <p className="text-sm bg-muted p-2 rounded">{contact.notes}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* CRM Action */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowDealDialog(true)}
        >
          <Target className="h-4 w-4 mr-2" />
          Criar Negociação
        </Button>
      </div>

      {/* Create Deal Dialog */}
      <Dialog open={showDealDialog} onOpenChange={setShowDealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Negociação — {contact?.name || contact?.phone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da negociação</Label>
              <Input
                placeholder="Ex: Proposta de serviço"
                value={dealTitle}
                onChange={(e) => setDealTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input
                placeholder="0,00"
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateDeal} className="w-full" disabled={isCreatingDeal}>
              {isCreatingDeal ? 'Criando...' : 'Criar e enviar pro CRM'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  )
}
