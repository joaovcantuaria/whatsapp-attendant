'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/hooks/use-company'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { QuickReply } from '@/types'
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Zap,
} from 'lucide-react'

export default function QuickRepliesSettingsPage() {
  const { company } = useCompany()
  const { toast } = useToast()
  const supabase = createClient()

  const [replies, setReplies] = useState<QuickReply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', shortcut: '' })

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from('quick_replies')
      .select('*')
      .order('title', { ascending: true })

    if (!error) {
      setReplies(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchReplies()
  }, [])

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({ title: 'Preencha título e conteúdo', variant: 'destructive' })
      return
    }

    const payload = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      shortcut: formData.shortcut.trim() || null,
      company_id: company?.id,
    }

    if (editingId) {
      const { error } = await supabase
        .from('quick_replies')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        toast({ title: 'Erro ao atualizar', variant: 'destructive' })
        return
      }
      toast({ title: 'Resposta rápida atualizada!' })
    } else {
      const { error } = await supabase
        .from('quick_replies')
        .insert(payload)

      if (error) {
        toast({ title: 'Erro ao criar', variant: 'destructive' })
        return
      }
      toast({ title: 'Resposta rápida criada!' })
    }

    resetForm()
    fetchReplies()
  }

  const handleEdit = (reply: QuickReply) => {
    setEditingId(reply.id)
    setFormData({
      title: reply.title,
      content: reply.content,
      shortcut: reply.shortcut || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('quick_replies')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
      return
    }

    toast({ title: 'Resposta rápida excluída' })
    fetchReplies()
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ title: '', content: '', shortcut: '' })
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Respostas Rápidas</h1>
            <p className="text-xs text-slate-500">
              Cadastre mensagens prontas para usar no chat. Digite / no campo de mensagem para acessá-las.
            </p>
          </div>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                {editingId ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Título *</label>
                <Input
                  placeholder="Ex: Saudação inicial"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Atalho</label>
                <Input
                  placeholder="Ex: oi (para usar /oi)"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value.replace(/\s/g, '') })}
                  className="mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Digite /{formData.shortcut || 'atalho'} no chat para usar esta resposta
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Conteúdo da mensagem *</label>
                <textarea
                  placeholder="Ex: Olá! Tudo bem? Como posso te ajudar?"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-8 text-sm text-slate-400">Carregando...</div>
        ) : replies.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                <MessageSquare className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Nenhuma resposta rápida cadastrada</p>
              <p className="text-xs text-slate-400">
                Crie mensagens prontas para agilizar o atendimento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {replies.map((reply) => (
              <Card key={reply.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{reply.title}</p>
                        {reply.shortcut && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            /{reply.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap line-clamp-2">
                        {reply.content}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(reply)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(reply.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-2">
          <p className="text-xs font-medium text-blue-700">Como usar:</p>
          <ul className="text-[11px] text-blue-600 space-y-1 list-disc pl-4">
            <li>No chat, digite <strong>/</strong> seguido do atalho para buscar respostas</li>
            <li>Exemplo: digitar <strong>/oi</strong> mostra respostas com "oi" no atalho ou título</li>
            <li>Selecione a resposta desejada e ela será inserida no campo de mensagem</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
