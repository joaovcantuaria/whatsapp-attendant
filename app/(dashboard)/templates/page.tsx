'use client'

import { useState } from 'react'
import { useTemplates } from '@/hooks/use-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Plus, RefreshCw, FileText } from 'lucide-react'

export default function TemplatesPage() {
  const { templates, isLoading, refetch } = useTemplates()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    language: 'pt_BR',
    category: 'utility',
    header_type: '',
    header_content: '',
    body: '',
    footer: '',
  })
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!formData.name || !formData.body) {
      toast({ title: 'Nome e corpo são obrigatórios', variant: 'destructive' })
      return
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({ title: 'Template criado e enviado para aprovação' })
        setShowCreateDialog(false)
        setFormData({ name: '', language: 'pt_BR', category: 'utility', header_type: '', header_content: '', body: '', footer: '' })
        refetch()
      } else {
        const data = await response.json()
        throw new Error(data.error)
      }
    } catch (error) {
      toast({ title: 'Erro ao criar template', variant: 'destructive' })
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch('/api/templates', { method: 'PUT' })
      if (response.ok) {
        toast({ title: 'Templates sincronizados com a Meta' })
        refetch()
      }
    } catch (error) {
      toast({ title: 'Erro ao sincronizar', variant: 'destructive' })
    } finally {
      setIsSyncing(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Aprovado</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>
      case 'pending':
        return <Badge variant="warning">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates de Mensagem</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum template cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{template.name}</span>
                  {statusBadge(template.status)}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                  {template.body}
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{template.language}</span>
                  {template.category && <span>• {template.category}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Template</DialogTitle>
            <DialogDescription>
              Crie um novo template para envio via WhatsApp. Será enviado para aprovação da Meta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="meu_template"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                />
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt_BR">Português (BR)</SelectItem>
                    <SelectItem value="en_US">Inglês (US)</SelectItem>
                    <SelectItem value="es">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="utility">Utilidade</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="authentication">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Corpo da mensagem</Label>
              <Textarea
                placeholder="Olá {{1}}, sua compra {{2}} foi confirmada!"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{1}}'}, {'{{2}}'}, etc. para variáveis
              </p>
            </div>

            <div className="space-y-2">
              <Label>Rodapé (opcional)</Label>
              <Input
                placeholder="Sua empresa"
                value={formData.footer}
                onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
              />
            </div>

            {/* Preview */}
            {formData.body && (
              <div className="p-3 bg-whatsapp-light rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Preview:</p>
                <p className="text-sm whitespace-pre-wrap">{formData.body}</p>
                {formData.footer && (
                  <p className="text-xs text-muted-foreground mt-2">{formData.footer}</p>
                )}
              </div>
            )}

            <Button onClick={handleCreate} className="w-full">
              Criar e Enviar para Aprovação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
