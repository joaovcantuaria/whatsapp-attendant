'use client'

import { useState } from 'react'
import { useContacts } from '@/hooks/use-contacts'
import { Contact } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatPhone, getInitials } from '@/lib/utils'
import { Search, Plus, Upload, Phone, Mail } from 'lucide-react'

export default function ContactsPage() {
  const { contacts, isLoading, createContact, refetch } = useContacts()
  const [search, setSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [newContact, setNewContact] = useState({ phone: '', name: '', email: '' })
  const [csvContent, setCsvContent] = useState('')
  const { toast } = useToast()

  const filteredContacts = contacts.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  const handleCreate = async () => {
    if (!newContact.phone) {
      toast({ title: 'Telefone obrigatório', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: newContact.phone,
          name: newContact.name || null,
          email: newContact.email || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({ title: 'Contato criado com sucesso' })
      setShowCreateDialog(false)
      setNewContact({ phone: '', name: '', email: '' })
      refetch()
    } catch (error) {
      toast({ title: 'Erro ao criar contato', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!csvContent.trim()) return

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: `${data.imported} contatos importados` })
        setShowImportDialog(false)
        setCsvContent('')
        refetch()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({ title: 'Erro na importação', variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Contatos</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Contato
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contact List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {contact.name ? getInitials(contact.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {contact.name || 'Sem nome'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        <span>{formatPhone(contact.phone)}</span>
                      </div>
                      {contact.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Contact Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>Adicione um novo contato ao sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Telefone (com código do país)</Label>
              <Input
                placeholder="5511999999999"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Nome do contato"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="email@exemplo.com"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              />
            </div>
            <Button onClick={handleCreate} className="w-full">
              Criar Contato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Contatos via CSV</DialogTitle>
            <DialogDescription>
              Cole o conteúdo do CSV abaixo. Formato: phone,name,email (cabeçalho obrigatório)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              className="w-full h-40 p-3 text-sm border rounded-md font-mono"
              placeholder="phone,name,email&#10;5511999999999,João Silva,joao@email.com&#10;5511888888888,Maria Santos,maria@email.com"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
            />
            <Button onClick={handleImport} className="w-full">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
