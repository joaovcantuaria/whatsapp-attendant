'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { useAgents } from '@/hooks/use-agents'
import { useDepartments, type Department } from '@/hooks/use-departments'
import { Network, Plus, Pencil, Trash2, Save, X, Star, Shuffle, Circle } from 'lucide-react'

const CORES = ['#F26522', '#2563EB', '#16A34A', '#9333EA', '#DB2777', '#0891B2', '#CA8A04', '#475569']

type Form = { name: string; color: string; is_default: boolean; auto_assign: boolean; member_ids: string[] }
const VAZIO: Form = { name: '', color: CORES[0], is_default: false, auto_assign: true, member_ids: [] }

export default function DepartmentsSettingsPage() {
  const { toast } = useToast()
  const { agents } = useAgents()
  const { departments, isLoading, refetch } = useDepartments()
  const [form, setForm] = useState<Form | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const abrirNovo = () => {
    setEditingId(null)
    setForm({ ...VAZIO, is_default: departments.length === 0 })
  }

  const abrirEdicao = (d: Department) => {
    setEditingId(d.id)
    setForm({ name: d.name, color: d.color || CORES[0], is_default: d.is_default, auto_assign: d.auto_assign, member_ids: d.member_ids })
  }

  const fechar = () => {
    setForm(null)
    setEditingId(null)
  }

  const alternarMembro = (id: string) =>
    setForm((f) => f && ({ ...f, member_ids: f.member_ids.includes(id) ? f.member_ids.filter((m) => m !== id) : [...f.member_ids, id] }))

  const salvar = async () => {
    if (!form?.name.trim()) {
      toast({ title: 'Dê um nome ao departamento', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/departments', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(editingId ? { id: editingId } : {}), ...form, name: form.name.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast({ title: editingId ? 'Departamento atualizado' : 'Departamento criado' })
      fechar()
      refetch()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const excluir = async (d: Department) => {
    if (!confirm(`Excluir o departamento "${d.name}"? As conversas dele ficam sem departamento.`)) return
    const res = await fetch(`/api/departments?id=${d.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Departamento excluído' })
      refetch()
    } else {
      const data = await res.json().catch(() => ({}))
      toast({ title: data.error || 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const nomeAgente = (id: string) => agents.find((a) => a.id === id)?.name || 'Atendente'

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Departamentos</h1>
            <p className="text-xs text-slate-500">
              Organize o atendimento em filas (ex.: Recepção, Financeiro). Conversas novas caem no departamento padrão
              e são distribuídas para o atendente online menos ocupado.
            </p>
          </div>
          {!form && (
            <Button size="sm" onClick={abrirNovo}>
              <Plus className="h-4 w-4 mr-1" />
              Novo
            </Button>
          )}
        </div>

        {form && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">
                {editingId ? 'Editar departamento' : 'Novo departamento'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Recepção"
                  className="mt-1"
                  maxLength={60}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">Cor</label>
                <div className="flex gap-2 mt-1">
                  {CORES.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setForm({ ...form, color: cor })}
                      className={`h-7 w-7 rounded-full border-2 ${form.color === cor ? 'border-slate-800' : 'border-transparent'}`}
                      style={{ backgroundColor: cor }}
                      aria-label={`Cor ${cor}`}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                <span>
                  <strong>Departamento padrão</strong>
                  <span className="block text-xs text-slate-500">Toda conversa nova entra aqui primeiro.</span>
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={form.auto_assign} onChange={(e) => setForm({ ...form, auto_assign: e.target.checked })} />
                <span>
                  <strong>Distribuir automaticamente</strong>
                  <span className="block text-xs text-slate-500">
                    Entrega cada conversa ao membro online com menos atendimentos em andamento. Desligado, as conversas
                    ficam na fila do departamento até alguém assumir.
                  </span>
                </span>
              </label>

              <div>
                <label className="text-xs font-medium text-slate-600">Atendentes deste departamento</label>
                <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
                  {agents.length === 0 && <p className="text-xs text-slate-400">Nenhum atendente cadastrado.</p>}
                  {agents.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={form.member_ids.includes(a.id)} onChange={() => alternarMembro(a.id)} />
                      <Circle className={`h-2 w-2 ${a.is_online ? 'fill-green-500 text-green-500' : 'fill-slate-300 text-slate-300'}`} />
                      <span className="truncate">{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={salvar} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={fechar} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
        ) : departments.length === 0 && !form ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="py-10 text-center space-y-2">
              <Network className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600">Nenhum departamento ainda.</p>
              <p className="text-xs text-slate-400">Sem departamentos, as conversas continuam chegando para todos, como hoje.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {departments.map((d) => (
              <Card key={d.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">{d.name}</p>
                      {d.is_default && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                          <Star className="h-3 w-3" /> Padrão
                        </span>
                      )}
                      {d.auto_assign && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
                          <Shuffle className="h-3 w-3" /> Distribui
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {d.member_ids.length === 0 ? 'Sem atendentes' : d.member_ids.map(nomeAgente).join(', ')}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => abrirEdicao(d)} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => excluir(d)} aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
