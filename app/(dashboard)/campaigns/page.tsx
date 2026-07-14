'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Plus,
  Send,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Megaphone,
  Search,
  Eye,
  Tag,
  Calendar,
  BarChart3,
  AlertCircle,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  description: string | null
  template_name: string
  template_language: string
  status: string
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  total_contacts: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  contact_ids: string[]
  created_at: string
}

interface Contact {
  id: string
  phone: string
  name: string | null
  email: string | null
  tags: string[] | null
}

interface Template {
  id: string
  name: string
  body: string
  language: string
  status: string
  category: string
  header_type?: string | null
  header_content?: string | null
  buttons?: any[] | null
  footer?: string | null
}

interface Category {
  id: string
  name: string
  color: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [contactCategoryMap, setContactCategoryMap] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSending, setIsSending] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [errorMessages, setErrorMessages] = useState<any[]>([])
  const [showErrorsDialog, setShowErrorsDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_name: '',
    template_language: 'pt_BR',
    scheduled_at: '',
  })
  const [headerMediaUrl, setHeaderMediaUrl] = useState('')
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setContacts(data)
      }
    } catch {
      // ignore
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.filter((t: Template) => t.status === 'approved'))
      }
    } catch {
      // ignore
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        setCategories(await res.json())
      }
    } catch {}
  }

  const fetchCategoryAssignments = async () => {
    try {
      const res = await fetch('/api/categories/assignments')
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, string[]> = {}
        for (const item of data) {
          if (!map[item.contact_id]) map[item.contact_id] = []
          map[item.contact_id].push(item.category_id)
        }
        setContactCategoryMap(map)
      }
    } catch {}
  }

  useEffect(() => {
    fetchCampaigns()
    fetchContacts()
    fetchTemplates()
    fetchCategories()
    fetchCategoryAssignments()
  }, [])

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.phone.includes(contactSearch)

    if (categoryFilter === 'all') return matchesSearch
    if (categoryFilter === 'none') {
      return matchesSearch && (!contactCategoryMap[c.id] || contactCategoryMap[c.id].length === 0)
    }
    return matchesSearch && contactCategoryMap[c.id]?.includes(categoryFilter)
  })

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id))
    }
  }

  const handleCreate = async () => {
    if (!formData.name || !formData.template_name || selectedContacts.length === 0) {
      toast({ title: 'Preencha todos os campos e selecione pelo menos 1 contato', variant: 'destructive' })
      return
    }

    // Validar URL de mídia se o template exige
    const template = templates.find((t) => t.name === formData.template_name)
    const needsMedia = template?.header_type &&
      ['image', 'video', 'document'].includes(template.header_type.toLowerCase())

    if (needsMedia && !headerMediaUrl) {
      toast({
        title: 'URL da mídia obrigatória',
        description: `O template selecionado requer uma URL de ${template.header_type} no header.`,
        variant: 'destructive',
      })
      return
    }

    // Montar template_components com mídia e variáveis
    const { buildTemplateComponents } = await import('@/lib/template-utils')
    const components = template
      ? buildTemplateComponents(template as any, templateVars, needsMedia ? headerMediaUrl : undefined)
      : []

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          template_components: components.length > 0 ? components : null,
          scheduled_at: formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null,
          contact_ids: selectedContacts,
        }),
      })

      if (res.ok) {
        toast({ title: formData.scheduled_at ? 'Campanha agendada!' : 'Campanha criada com sucesso!' })
        setShowCreateDialog(false)
        setFormData({ name: '', description: '', template_name: '', template_language: 'pt_BR', scheduled_at: '' })
        setHeaderMediaUrl('')
        setTemplateVars({})
        setSelectedContacts([])
        fetchCampaigns()
      } else {
        const data = await res.json()
        toast({ title: data.error || 'Erro ao criar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao criar campanha', variant: 'destructive' })
    }
  }

  const handleSend = async (campaignId: string) => {
    setIsSending(campaignId)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaignId, action: 'send' }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Campanha enviada!',
          description: `${data.sent} enviadas, ${data.failed} falharam de ${data.total} total`,
        })
        fetchCampaigns()
      } else {
        toast({ title: data.error || 'Erro ao enviar', variant: 'destructive', duration: 8000 })
      }
    } catch {
      toast({ title: 'Erro ao enviar campanha', variant: 'destructive' })
    } finally {
      setIsSending(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (res.ok) {
        toast({ title: 'Campanha excluída' })
        fetchCampaigns()
      }
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'cancel' }),
      })

      if (res.ok) {
        toast({ title: 'Campanha cancelada' })
        fetchCampaigns()
      }
    } catch {
      toast({ title: 'Erro ao cancelar', variant: 'destructive' })
    }
  }

  const viewErrors = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns/messages?campaignId=${campaignId}&status=failed`)
      if (res.ok) {
        const data = await res.json()
        setErrorMessages(data)
        setShowErrorsDialog(true)
      }
    } catch {
      toast({ title: 'Erro ao buscar detalhes', variant: 'destructive' })
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: Clock },
    scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700', icon: Clock },
    running: { label: 'Enviando...', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
    completed: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700', icon: XCircle },
  }

  const selectedTemplate = templates.find((t) => t.name === formData.template_name)

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Campanhas</h1>
            <p className="text-xs text-slate-500">Dispare mensagens em massa para seus contatos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/campaigns/reports'}>
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Relatórios
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nova Campanha
            </Button>
          </div>
        </div>

        {/* Campaigns List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm text-slate-500 mb-2">Nenhuma campanha criada</p>
            <p className="text-xs text-slate-400 mb-4">Crie sua primeira campanha para disparar mensagens em massa</p>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Criar Campanha
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => {
              const config = statusConfig[campaign.status] || statusConfig.draft
              const StatusIcon = config.icon
              const sending = isSending === campaign.id

              return (
                <Card key={campaign.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-sm text-slate-800">{campaign.name}</h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
                            <StatusIcon className={`h-3 w-3 ${campaign.status === 'running' ? 'animate-spin' : ''}`} />
                            {config.label}
                          </span>
                        </div>
                        {campaign.description && (
                          <p className="text-xs text-slate-500 mb-2">{campaign.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {campaign.total_contacts} contatos
                          </span>
                          <span>Template: {campaign.template_name}</span>
                          {campaign.scheduled_at && campaign.status === 'scheduled' && (
                            <span className="flex items-center gap-1 text-blue-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(campaign.scheduled_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {campaign.completed_at && (
                            <span>
                              Enviada em {new Date(campaign.completed_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {/* Stats */}
                        {(campaign.status === 'completed' || campaign.status === 'running') && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-slate-600">{campaign.sent_count} enviadas</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-slate-600">{campaign.delivered_count} entregues</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-slate-600">{campaign.read_count} lidas</span>
                            </div>
                            {campaign.failed_count > 0 && (
                              <button
                                onClick={() => viewErrors(campaign.id)}
                                className="flex items-center gap-1 text-xs hover:underline"
                              >
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-red-600">{campaign.failed_count} falharam</span>
                                <AlertCircle className="h-3 w-3 text-red-400" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                          <Button
                            size="sm"
                            onClick={() => handleSend(campaign.id)}
                            disabled={sending}
                            className="bg-[#25D366] hover:bg-[#1da851] text-white"
                          >
                            {sending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {sending ? 'Enviando...' : 'Enviar'}
                          </Button>
                        )}
                        {campaign.status === 'running' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(campaign.id)}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Cancelar
                          </Button>
                        )}
                        {(campaign.status === 'draft' || campaign.status === 'completed' || campaign.status === 'cancelled') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(campaign.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
            <DialogDescription>
              Selecione um template aprovado e os contatos para disparo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto flex-1 pr-2">
            {/* Nome e Descrição */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Nome da campanha</Label>
                <Input
                  placeholder="Ex: Promoção de Julho"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  placeholder="Breve descrição"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label className="text-xs">Template aprovado</Label>
              {templates.length === 0 ? (
                <p className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg">
                  ⚠️ Nenhum template aprovado disponível. Crie e aguarde a aprovação da Meta na aba Templates.
                </p>
              ) : (
                <Select
                  value={formData.template_name}
                  onValueChange={(v) => {
                    const t = templates.find((t) => t.name === v)
                    setFormData({
                      ...formData,
                      template_name: v,
                      template_language: t?.language || 'pt_BR',
                    })
                    setHeaderMediaUrl('')
                    setTemplateVars({})
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.name}>
                        {t.name} ({t.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-3 w-3 text-green-600" />
                    <span className="text-[10px] font-medium text-green-700">Preview do template</span>
                    {selectedTemplate.header_type && ['image', 'video', 'document'].includes(selectedTemplate.header_type.toLowerCase()) && (
                      <Badge variant="outline" className="text-[9px]">
                        Header: {selectedTemplate.header_type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedTemplate.body}</p>
                </div>
              )}

              {/* URL de Mídia do Header */}
              {selectedTemplate?.header_type && ['image', 'video', 'document'].includes(selectedTemplate.header_type.toLowerCase()) && (
                <div className="space-y-2 mt-2">
                  <Label className="text-xs font-medium text-orange-700">
                    ⚠️ URL da mídia do header ({selectedTemplate.header_type})
                  </Label>
                  <Input
                    placeholder={`https://exemplo.com/${selectedTemplate.header_type === 'image' ? 'imagem.jpg' : selectedTemplate.header_type === 'video' ? 'video.mp4' : 'arquivo.pdf'}`}
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500">
                    Obrigatório: URL pública acessível para {selectedTemplate.header_type === 'image' ? 'a imagem' : selectedTemplate.header_type === 'video' ? 'o vídeo' : 'o documento'} que será exibido no topo do template.
                  </p>
                </div>
              )}

              {/* Variáveis do Template */}
              {selectedTemplate && (() => {
                const bodyVars = selectedTemplate.body?.match(/\{\{(\d+)\}\}/g)
                if (!bodyVars || bodyVars.length === 0) return null
                const uniqueVars = Array.from(new Set(bodyVars)) as string[]
                return (
                  <div className="space-y-2 mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-[10px] font-medium text-blue-700">
                      📝 Este template tem variáveis que precisam ser preenchidas:
                    </p>
                    {uniqueVars.map((v) => (
                      <div key={v} className="space-y-1">
                        <Label className="text-[10px] text-slate-500">{v}</Label>
                        <Input
                          placeholder={`Valor para ${v} (ex: nome, data, etc.)`}
                          value={templateVars[v] || ''}
                          onChange={(e) => setTemplateVars((prev) => ({ ...prev, [v]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                    <p className="text-[10px] text-slate-400">
                      Estes valores serão usados para todos os contatos. Use {{'{'}}{'{'}1{'}'}{'{'}'}{'}'} = nome se quiser personalizar.
                    </p>
                  </div>
                )
              })()}
            </div>

            {/* Agendamento */}
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                Agendar envio (opcional)
              </Label>
              <Input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="h-9"
              />
              <p className="text-[10px] text-slate-400">
                Deixe vazio para enviar manualmente. Se agendar, a campanha será criada com status "Agendada".
              </p>
            </div>

            {/* Contatos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Contatos ({selectedContacts.length} selecionados)</Label>
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
                  {selectedContacts.length === filteredContacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contato..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px] h-9">
                    <Tag className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredContacts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum contato encontrado</p>
                  ) : (
                    filteredContacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => toggleContact(contact.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {contact.name || 'Sem nome'}
                          </p>
                          <p className="text-[10px] text-slate-400">{contact.phone}</p>
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex gap-1">
                            {contact.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[8px] px-1">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <p className="text-xs text-slate-500">
              {selectedContacts.length} contato{selectedContacts.length !== 1 ? 's' : ''} selecionado{selectedContacts.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Megaphone className="h-3.5 w-3.5 mr-1.5" />
                Criar Campanha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Errors Dialog */}
      <Dialog open={showErrorsDialog} onOpenChange={setShowErrorsDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Erros de Envio
            </DialogTitle>
            <DialogDescription>
              Detalhes dos envios que falharam nesta campanha
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[60vh]">
            {errorMessages.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Nenhum erro encontrado</p>
            ) : (
              <div className="space-y-2 pr-2">
                {errorMessages.map((msg: any, i: number) => (
                  <div key={msg.id || i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-700">{msg.phone}</span>
                      <Badge variant="destructive" className="text-[9px]">Falhou</Badge>
                    </div>
                    <p className="text-[11px] text-red-700 break-all">
                      {msg.error_message || 'Sem detalhes do erro'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
