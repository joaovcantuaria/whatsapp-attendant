'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
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
import { formatPhone, getInitials } from '@/lib/utils'
import { Search, Plus, Upload, Phone, Mail, Tag, X, FolderPlus } from 'lucide-react'

interface Contact {
  id: string
  phone: string
  name: string | null
  email: string | null
  tags: string[] | null
  categories?: Category[]
}

interface Category {
  id: string
  name: string
  color: string
  description: string | null
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [newContact, setNewContact] = useState({ phone: '', name: '', email: '' })
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [csvContent, setCsvContent] = useState('')
  const [importCategoryId, setImportCategoryId] = useState<string>('')
  const [newCategory, setNewCategory] = useState({ name: '', color: '#F26522', description: '' })
  const [contactCategories, setContactCategories] = useState<Record<string, string[]>>({}) // contact_id -> category_ids
  const { toast } = useToast()

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      if (res.ok) {
        const data = await res.json()
        setContacts(data)
      }
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch {}
  }

  const fetchContactCategories = async () => {
    try {
      const res = await fetch('/api/categories/assignments')
      if (res.ok) {
        const data = await res.json()
        // Transformar em map: contact_id -> [category_ids]
        const map: Record<string, string[]> = {}
        for (const item of data) {
          if (!map[item.contact_id]) map[item.contact_id] = []
          map[item.contact_id].push(item.category_id)
        }
        setContactCategories(map)
      }
    } catch {}
  }

  useEffect(() => {
    fetchContacts()
    fetchCategories()
    fetchContactCategories()
  }, [])

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)

    if (filterCategory === 'all') return matchesSearch
    if (filterCategory === 'none') {
      return matchesSearch && (!contactCategories[c.id] || contactCategories[c.id].length === 0)
    }
    return matchesSearch && contactCategories[c.id]?.includes(filterCategory)
  })

  const getContactCategoryBadges = (contactId: string) => {
    const catIds = contactCategories[contactId] || []
    return categories.filter((c) => catIds.includes(c.id))
  }

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
          category_ids: selectedCategories,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }

      toast({ title: 'Contato criado com sucesso' })
      setShowCreateDialog(false)
      setNewContact({ phone: '', name: '', email: '' })
      setSelectedCategories([])
      fetchContacts()
      fetchContactCategories()
    } catch (error) {
      toast({ title: 'Erro ao criar contato', description: error instanceof Error ? error.message : 'Erro', variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!csvContent.trim()) return

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          category_id: importCategoryId || null,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: `${data.imported} contatos importados` })
        setShowImportDialog(false)
        setCsvContent('')
        setImportCategoryId('')
        fetchContacts()
        fetchContactCategories()
      } else {
        throw new Error(data.error)
      }
    } catch {
      toast({ title: 'Erro na importação', variant: 'destructive' })
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      })

      if (res.ok) {
        toast({ title: 'Categoria criada!' })
        setNewCategory({ name: '', color: '#F26522', description: '' })
        setShowCategoryDialog(false)
        fetchCategories()
      } else {
        const data = await res.json()
        toast({ title: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        toast({ title: 'Categoria excluída' })
        fetchCategories()
        fetchContactCategories()
      }
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const toggleCategorySelection = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((x) => x !== catId) : [...prev, catId]
    )
  }

  const colorPresets = ['#EF4444', '#F97316', '#F59E0B', '#22C55E', '#10B981', '#3B82F6', '#6366F1', '#A855F7', '#EC4899', '#6B7280']

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">Contatos</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCategoryDialog(true)}>
              <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
              Categorias
            </Button>
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

        {/* Search + Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <Tag className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{filteredContacts.length} contato{filteredContacts.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span>{categories.length} categoria{categories.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Contact List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContacts.map((contact) => {
              const cats = getContactCategoryBadges(contact.id)
              return (
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
                    {cats.length > 0 && (
                      <div className="flex gap-1 mt-2.5 flex-wrap">
                        {cats.map((cat) => (
                          <span
                            key={cat.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
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

            {/* Categorias */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Categorias
              </Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-slate-50 min-h-[60px]">
                {categories.length === 0 ? (
                  <span className="text-xs text-slate-400">Nenhuma categoria criada</span>
                ) : (
                  categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id)
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategorySelection(cat.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                        style={isSelected ? { backgroundColor: cat.color } : {}}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isSelected ? 'white' : cat.color }}
                        />
                        {cat.name}
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <Button onClick={handleCreate} className="w-full bg-[#F26522] hover:bg-[#d4561c]">
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
              Cole o conteúdo do CSV. Formato: phone,name,email (cabeçalho obrigatório)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Categoria da importação */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                Importar para qual categoria? (opcional)
              </Label>
              <Select value={importCategoryId} onValueChange={setImportCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Geral (sem categoria)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Geral (sem categoria)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <textarea
              className="w-full h-40 p-3 text-sm border rounded-md font-mono"
              placeholder="phone,name,email&#10;5511999999999,João Silva,joao@email.com&#10;5511888888888,Maria Santos,maria@email.com"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
            />
            <Button onClick={handleImport} className="w-full bg-[#F26522] hover:bg-[#d4561c]">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
            <DialogDescription>
              Crie e organize categorias para segmentar seus contatos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Create new */}
            <div className="space-y-3 p-4 border rounded-lg bg-slate-50">
              <Label className="text-xs font-medium">Nova categoria</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da categoria"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleCreateCategory} className="bg-[#F26522] hover:bg-[#d4561c]">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Input
                placeholder="Descrição (opcional)"
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-500">Cor:</Label>
                <div className="flex gap-1.5">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        newCategory.color === color ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Existing categories */}
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <div>
                        <span className="text-sm font-medium">{cat.name}</span>
                        {cat.description && (
                          <p className="text-[10px] text-slate-400">{cat.description}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
