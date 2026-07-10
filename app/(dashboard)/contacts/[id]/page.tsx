'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Contact, Conversation } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { formatPhone, getInitials, formatRelativeTime } from '@/lib/utils'
import { Save, Phone, Mail, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function ContactDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const { toast } = useToast()
  const [contact, setContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editData, setEditData] = useState({ name: '', email: '', notes: '', tags: '' })

  useEffect(() => {
    const fetchData = async () => {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single()

      if (contactData) {
        setContact(contactData)
        setEditData({
          name: contactData.name || '',
          email: contactData.email || '',
          notes: contactData.notes || '',
          tags: contactData.tags?.join(', ') || '',
        })
      }

      const { data: convData } = await supabase
        .from('conversations')
        .select('*, agent:agents(*)')
        .eq('contact_id', id)
        .order('created_at', { ascending: false })

      if (convData) {
        setConversations(convData)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [id, supabase])

  const handleSave = async () => {
    if (!contact) return

    try {
      const response = await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          name: editData.name || null,
          email: editData.email || null,
          notes: editData.notes || null,
          tags: editData.tags ? editData.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
        }),
      })

      if (response.ok) {
        toast({ title: 'Contato atualizado' })
      } else {
        throw new Error()
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Contato não encontrado</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={contact.profile_picture || ''} />
          <AvatarFallback className="text-lg">
            {contact.name ? getInitials(contact.name) : '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{contact.name || 'Sem nome'}</h1>
          <p className="text-muted-foreground">{formatPhone(contact.phone)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editData.email}
                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={editData.tags}
                onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                placeholder="vip, premium, suporte"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                rows={4}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Conversation History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma conversa registrada</p>
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <Link key={conv.id} href={`/conversations/${conv.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={conv.status === 'open' ? 'success' : conv.status === 'pending' ? 'warning' : 'secondary'}>
                          {conv.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(conv.created_at)}
                        </span>
                      </div>
                      <p className="text-sm truncate">{conv.last_message || 'Sem mensagens'}</p>
                      {conv.agent && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Agente: {conv.agent.name}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
