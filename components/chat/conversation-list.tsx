'use client'

import { useState } from 'react'
import { useConversations } from '@/hooks/use-conversations'
import { useConversationStore } from '@/store/conversation-store'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConversationItem } from './conversation-item'
import { AgentFilter } from './agent-filter'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Search, MessageCircle, Plus, Send } from 'lucide-react'
import { ConversationStatus } from '@/types'
import { buildTemplateComponents } from '@/lib/template-utils'

export function ConversationList() {
  const { filter, setFilter, searchQuery, setSearchQuery, agentFilter } = useConversationStore()
  const { conversations, isLoading, refetch } = useConversations(filter)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [newConvMode, setNewConvMode] = useState<'select' | 'create'>('select')
  const [contacts, setContacts] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newConvMessage, setNewConvMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const { toast } = useToast()

  const openNewConversation = async () => {
    setShowNewConversation(true)
    setNewConvMode('select')
    setSelectedContactId('')
    setSelectedTemplate('')
    setNewContactPhone('')
    setNewContactName('')
    setNewConvMessage('')
    // Fetch contacts and templates
    try {
      const [contactsRes, templatesRes] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/templates'),
      ])
      if (contactsRes.ok) setContacts(await contactsRes.json())
      if (templatesRes.ok) {
        const allTemplates = await templatesRes.json()
        setTemplates(allTemplates.filter((t: any) => t.status === 'approved'))
      }
    } catch {}
  }

  const handleStartConversation = async () => {
    let phone = ''
    let contactId = ''

    if (newConvMode === 'create') {
      if (!newContactPhone) {
        toast({ title: 'Telefone obrigatório', variant: 'destructive' })
        return
      }
      // Criar contato
      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: newContactPhone, name: newContactName || null }),
        })
        if (res.ok) {
          const contact = await res.json()
          contactId = contact.id
          phone = contact.phone
        } else {
          const err = await res.json()
          toast({ title: err.error || 'Erro ao criar contato', variant: 'destructive' })
          return
        }
      } catch {
        toast({ title: 'Erro ao criar contato', variant: 'destructive' })
        return
      }
    } else {
      if (!selectedContactId) {
        toast({ title: 'Selecione um contato', variant: 'destructive' })
        return
      }
      const contact = contacts.find((c: any) => c.id === selectedContactId)
      if (!contact) return
      phone = contact.phone
      contactId = contact.id
    }

    if (!selectedTemplate && !newConvMessage) {
      toast({ title: 'Digite uma mensagem ou selecione um template', variant: 'destructive' })
      return
    }

    setIsSending(true)
    try {
      // Criar conversa
      const convRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, channel: 'whatsapp' }),
      })

      if (!convRes.ok) {
        const err = await convRes.json()
        toast({ title: err.error || 'Erro ao criar conversa', variant: 'destructive' })
        return
      }

      const conversation = await convRes.json()

      let sent = false

      // Se tem template selecionado, PRIORIZAR o template
      if (selectedTemplate) {
        const template = templates.find((t: any) => t.name === selectedTemplate)
        const components = buildTemplateComponents(template, templateVars)

        const sendRes = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            phone,
            type: 'template',
            templateName: template?.name,
            templateLanguage: template?.language || 'pt_BR',
            templateComponents: components.length > 0 ? components : undefined,
          }),
        })

        if (sendRes.ok) {
          sent = true
        } else {
          const err = await sendRes.json()
          toast({ title: err.error || 'Erro ao enviar template', variant: 'destructive' })
          return
        }
      }
      // Se não tem template, tentar mensagem livre
      else if (newConvMessage) {
        const textRes = await fetch('/api/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            phone,
            type: 'text',
            content: newConvMessage,
          }),
        })

        if (textRes.ok) {
          sent = true
        } else {
          // Mensagem livre falhou (janela fechada), avisar que precisa de template
          toast({ title: 'Janela de 24h fechada. Selecione um template para enviar.', variant: 'destructive' })
          return
        }
      }

      toast({ title: 'Conversa iniciada!' })
      setShowNewConversation(false)
      refetch()
    } catch {
      toast({ title: 'Erro ao iniciar conversa', variant: 'destructive' })
    } finally {
      setIsSending(false)
    }
  }

  const filteredConvContacts = contacts.filter((c: any) =>
    !contactSearch ||
    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.phone.includes(contactSearch)
  )

  const filteredConversations = conversations.filter((conv) => {
    if (agentFilter !== 'all' && conv.agent_id !== agentFilter) return false
    if (searchQuery) {
      const contactName = conv.contact?.name || ''
      const contactPhone = conv.contact?.phone || ''
      if (
        !contactName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !contactPhone.includes(searchQuery)
      ) return false
    }
    return true
  })

  const tabs = [
    { value: 'all', label: 'Todas', count: conversations.length },
    { value: 'pending', label: 'Pendentes', count: conversations.filter(c => c.status === 'pending').length },
    { value: 'open', label: 'Abertas', count: conversations.filter(c => c.status === 'open').length },
    { value: 'closed', label: 'Fechadas', count: conversations.filter(c => c.status === 'closed').length },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Conversas</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] px-1.5">{filteredConversations.length}</Badge>
            <Button size="sm" variant="ghost" onClick={openNewConversation} className="h-7 w-7 p-0 text-slate-500 hover:text-[#F26522]">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Agent Filter */}
        <AgentFilter />

        {/* Tabs */}
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as ConversationStatus | 'all')}
              className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                filter === tab.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-2.5 p-2">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <MessageCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">Nenhuma conversa</p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>Inicie uma conversa enviando um template aprovado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Toggle: select existing or create new */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setNewConvMode('select')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  newConvMode === 'select' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Contato existente
              </button>
              <button
                onClick={() => setNewConvMode('create')}
                className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  newConvMode === 'create' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                }`}
              >
                Novo contato
              </button>
            </div>

            {newConvMode === 'select' ? (
              <div className="space-y-2">
                <Label className="text-xs">Selecionar contato</Label>
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="h-9 text-xs"
                />
                <ScrollArea className="h-36 border rounded-lg">
                  <div className="p-1">
                    {filteredConvContacts.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum contato</p>
                    ) : (
                      filteredConvContacts.map((contact: any) => (
                        <button
                          key={contact.id}
                          onClick={() => setSelectedContactId(contact.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                            selectedContactId === contact.id ? 'bg-orange-50 border border-[#F26522]/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium">
                            {contact.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{contact.name || 'Sem nome'}</p>
                            <p className="text-[10px] text-slate-400">{contact.phone}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Telefone (com código do país)</Label>
                  <Input
                    placeholder="5511999999999"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Nome (opcional)</Label>
                  <Input
                    placeholder="Nome do contato"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            {/* Template selection */}
            <div className="space-y-2">
              <Label className="text-xs">Mensagem inicial</Label>
              <Input
                placeholder="Ex: Olá, tudo bem? Gostaria de falar sobre..."
                value={newConvMessage}
                onChange={(e) => setNewConvMessage(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Se a janela de 24h estiver aberta, envia como mensagem livre. Caso contrário, usa template.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Template (usado se janela fechada)</Label>
              {templates.length === 0 ? (
                <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  Nenhum template aprovado. Crie um na aba Templates.
                </p>
              ) : (
                <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setTemplateVars({}) }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={t.name} className="text-xs">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Variáveis do template */}
              {selectedTemplate && (() => {
                const tpl = templates.find((t: any) => t.name === selectedTemplate)
                const vars = tpl?.body?.match(/\{\{(\d+)\}\}/g) || []
                const uniqueVars = Array.from(new Set(vars)) as string[]
                if (!tpl) return null

                // Auto-preencher {{1}} com nome do contato se disponível
                const selectedContact = contacts.find((c: any) => c.id === selectedContactId)
                if (uniqueVars.includes('{{1}}') && selectedContact?.name && !templateVars['{{1}}']) {
                  setTimeout(() => setTemplateVars(prev => ({ ...prev, '{{1}}': prev['{{1}}'] || selectedContact.name })), 0)
                }

                return (
                  <div className="space-y-2 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Preview do template:</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-2 rounded border border-slate-100">
                      {tpl.body}
                    </p>
                    {uniqueVars.length > 0 && (
                      <>
                        <p className="text-[10px] text-slate-500 font-medium uppercase pt-2">Preencha as variáveis:</p>
                        {uniqueVars.map((v: string) => (
                          <div key={v} className="space-y-0.5">
                            <label className="text-[10px] text-slate-400">
                              {v === '{{1}}' ? `${v} — Nome do contato` : v}
                            </label>
                            <Input
                              placeholder={`Valor para ${v}`}
                              value={templateVars[v] || ''}
                              onChange={(e) => setTemplateVars(prev => ({ ...prev, [v]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )
              })()}
            </div>

            <Button
              onClick={handleStartConversation}
              disabled={isSending}
              className="w-full bg-[#F26522] hover:bg-[#d4561c]"
            >
              <Send className="h-3.5 w-3.5 mr-2" />
              {isSending ? 'Enviando...' : 'Iniciar Conversa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
