'use client'

import { useState } from 'react'
import { Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase'
import { formatPhone, getInitials } from '@/lib/utils'
import {
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Target,
  ArrowRightLeft,
  UserPlus,
  Clock,
  Calendar,
  FileText,
  History,
} from 'lucide-react'

interface ContactPanelV2Props {
  conversation: Conversation
}

interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

export function ContactPanelV2({ conversation }: ContactPanelV2Props) {
  const contact = conversation.contact
  const { agent } = useAuthStore()
  const supabase = createClient()
  const { toast } = useToast()
  const [noteContent, setNoteContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !agent) return
    setIsSaving(true)
    try {
      await supabase.from('conversation_notes').insert({
        conversation_id: conversation.id,
        agent_id: agent.id,
        content: noteContent.trim(),
      })
      toast({ title: 'Nota salva' })
      setNoteContent('')
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTransfer = () => {
    toast({ title: 'Transferir atendimento', description: 'Selecione o atendente destino (em breve)' })
  }

  const handleCreateDeal = async () => {
    try {
      const pipelineRes = await fetch('/api/crm/pipeline')
      if (!pipelineRes.ok) { toast({ title: 'Pipeline não configurado', variant: 'destructive' }); return }
      const pipelineData = await pipelineRes.json()
      const firstStage = pipelineData.stages?.[0]
      if (!firstStage) { toast({ title: 'Configure o pipeline primeiro', variant: 'destructive' }); return }

      const response = await fetch('/api/crm/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Lead - ${contact?.name || contact?.phone || 'Contato'}`,
          value: 0,
          contact_id: contact?.id || null,
          stage_id: firstStage.id,
          pipeline_id: pipelineData.pipeline.id,
        }),
      })
      if (response.ok) {
        toast({ title: '🎯 Lead sinalizado no CRM!' })
      }
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  return (
    <ScrollArea className="h-full bg-white">
      {/* Contact header */}
      <div className="p-4 pb-3 text-center border-b border-slate-100">
        <Avatar className="h-12 w-12 mx-auto mb-2">
          <AvatarImage src={contact?.profile_picture || ''} />
          <AvatarFallback className="text-sm bg-[#F26522]/10 text-[#F26522] font-semibold">
            {contact?.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        <h3 className="text-sm font-semibold text-slate-800">{contact?.name || 'Contato'}</h3>
        <p className="text-[11px] text-slate-400">{contact?.phone ? formatPhone(contact.phone) : ''}</p>

        {/* Quick actions */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" onClick={handleTransfer}>
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Transferir
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 text-[#F26522] border-[#F26522]/30" onClick={handleCreateDeal}>
            <Target className="h-3 w-3 mr-1" />
            Lead
          </Button>
        </div>
      </div>

      {/* Collapsible sections */}
      <CollapsibleSection title="Detalhes" icon={<Phone className="h-3.5 w-3.5" />} defaultOpen={true}>
        <div className="space-y-2">
          {contact?.phone && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{formatPhone(contact.phone)}</span>
            </div>
          )}
          {contact?.email && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Mail className="h-3 w-3 text-slate-400" />
              <span>{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <UserPlus className="h-3 w-3 text-slate-400" />
            <span>Agente: {conversation.agent?.name || 'Não atribuído'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>Status: {conversation.status === 'open' ? 'Em atendimento' : conversation.status === 'pending' ? 'Aguardando' : 'Encerrado'}</span>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Agendamentos" icon={<Calendar className="h-3.5 w-3.5" />}>
        <p className="text-xs text-slate-400 text-center py-2">Nenhum agendamento</p>
      </CollapsibleSection>

      <CollapsibleSection title="Resumo" icon={<FileText className="h-3.5 w-3.5" />}>
        <p className="text-xs text-slate-500 leading-relaxed">
          {conversation.last_message
            ? `Última mensagem: "${conversation.last_message}"`
            : 'Sem mensagens ainda'}
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Anotações" icon={<StickyNote className="h-3.5 w-3.5" />} defaultOpen={true}>
        <div className="space-y-2">
          <Textarea
            placeholder="Adicionar nota..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="min-h-[50px] text-xs resize-none"
          />
          <Button
            size="sm"
            onClick={handleSaveNote}
            disabled={!noteContent.trim() || isSaving}
            className="w-full h-7 text-[11px] bg-[#F26522] hover:bg-[#d4561c]"
          >
            Salvar Nota
          </Button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Histórico" icon={<History className="h-3.5 w-3.5" />}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Conversa iniciada
          </div>
          {conversation.agent?.name && (
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Atribuído para {conversation.agent.name}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </ScrollArea>
  )
}
