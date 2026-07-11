'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { getInitials } from '@/lib/utils'
import {
  User, Phone, Mail, MapPin, Tag, DollarSign, ShoppingBag,
  TrendingUp, MessageCircle, Calendar, FileText, Edit, Save, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function ContactProfilePage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [newNote, setNewNote] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/crm/contacts/${id}`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setNotes(result.contact.notes || '')
      }
      setIsLoading(false)
    }
    fetchProfile()
  }, [id])

  const handleSaveNotes = async () => {
    await fetch(`/api/crm/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    toast({ title: 'Observações salvas!' })
  }

  const handleAddActivity = async () => {
    if (!newNote.trim()) return
    await fetch('/api/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: id, type: 'note', content: newNote }),
    })
    setNewNote('')
    toast({ title: 'Nota adicionada!' })
    // Reload
    const res = await fetch(`/api/crm/contacts/${id}`)
    if (res.ok) setData(await res.json())
  }

  if (isLoading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-48" /><Skeleton className="h-96" /></div>
  }

  if (!data) {
    return <div className="p-6 text-center text-muted-foreground">Contato não encontrado</div>
  }

  const { contact, deals, activities, purchases, tasks, conversations, metrics } = data
  const statusColor = metrics.clientStatus === 'active' ? 'success' : metrics.clientStatus === 'at_risk' ? 'warning' : 'destructive'
  const statusLabel = metrics.clientStatus === 'active' ? 'Ativo' : metrics.clientStatus === 'at_risk' ? 'Em risco' : 'Inativo'

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/crm"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl bg-primary/10 text-primary">{getInitials(contact.name || '?')}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{contact.name || 'Sem nome'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusColor as any}>{statusLabel}</Badge>
              {contact.tags?.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 - Info + Métricas */}
        <div className="space-y-4">
          {/* Dados */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{contact.phone}</div>}
              {contact.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{contact.email}</div>}
              {contact.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{contact.address}</div>}
              {contact.origin_channel && <div className="flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" />Canal: {contact.origin_channel}</div>}
              {contact.birthday && <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Aniversário: {new Date(contact.birthday + 'T00:00:00').toLocaleDateString('pt-BR')}</div>}
            </CardContent>
          </Card>

          {/* Métricas */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Resumo Financeiro</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total gasto</span>
                <span className="font-bold text-green-600">R$ {metrics.totalSpent.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ticket médio</span>
                <span className="font-medium">R$ {metrics.avgTicket.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Compras/Serviços</span>
                <span className="font-medium">{metrics.purchaseCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último contato</span>
                <span className="font-medium">{metrics.daysSinceLastInteraction} dias atrás</span>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Observações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre o cliente..." rows={4} />
              <Button size="sm" onClick={handleSaveNotes} className="w-full"><Save className="h-3 w-3 mr-1" /> Salvar</Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2 - Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Adicionar nota rápida */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Input placeholder="Adicionar nota ou registro de atividade..." value={newNote} onChange={e => setNewNote(e.target.value)} />
                <Button onClick={handleAddActivity} disabled={!newNote.trim()}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          {/* Negociações */}
          {deals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Negociações ({deals.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deals.map((deal: any) => (
                  <div key={deal.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{deal.title}</p>
                      <p className="text-xs text-muted-foreground">{deal.stage?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">R$ {Number(deal.value).toLocaleString('pt-BR')}</p>
                      <Badge variant={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'destructive' : 'secondary'} className="text-[9px]">
                        {deal.status === 'won' ? 'Ganho' : deal.status === 'lost' ? 'Perdido' : 'Aberto'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline de Atividades */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Linha do Tempo</CardTitle></CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-3">
                  {activities.map((act: any) => {
                    const iconMap: Record<string, string> = {
                      note: '📝', call: '📞', email: '✉️', meeting: '🤝',
                      whatsapp: '💬', deal_created: '🎯', deal_moved: '➡️',
                      deal_won: '🏆', deal_lost: '❌',
                    }
                    return (
                      <div key={act.id} className="flex gap-3 items-start">
                        <span className="text-lg shrink-0">{iconMap[act.type] || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{act.content}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {act.agent?.name} • {new Date(act.created_at).toLocaleDateString('pt-BR')} {new Date(act.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarefas pendentes */}
          {tasks.filter((t: any) => t.status !== 'completed').length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Tarefas Pendentes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.filter((t: any) => t.status !== 'completed').map((task: any) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <span className="text-sm flex-1">{task.title}</span>
                    {task.due_date && <span className="text-xs text-muted-foreground">{new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                    <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[9px]">
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
