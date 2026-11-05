'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { ListPlus, Plus, Save, Trash2, X } from 'lucide-react'
import type { DefinicaoCampo, TipoCampo } from '@/lib/campos-personalizados'

const ROTULOS_TIPO: Record<TipoCampo, string> = { texto: 'Texto', numero: 'Número', data: 'Data', lista: 'Lista de opções' }

export default function ContactFieldsSettingsPage() {
  const { toast } = useToast()
  const [campos, setCampos] = useState<DefinicaoCampo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novo, setNovo] = useState<{ label: string; type: TipoCampo; options: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const res = await fetch('/api/contact-fields')
    if (res.ok) setCampos(await res.json())
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  const criar = async () => {
    if (!novo) return
    setSalvando(true)
    try {
      const res = await fetch('/api/contact-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: novo.label, type: novo.type, options: novo.options.split(',').map((o) => o.trim()).filter(Boolean) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      toast({ title: 'Campo criado' })
      setNovo(null)
      carregar()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao criar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (c: DefinicaoCampo) => {
    if (!confirm(`Excluir o campo "${c.label}"? Os valores já preenchidos deixam de aparecer.`)) return
    const res = await fetch(`/api/contact-fields?id=${c.id}`, { method: 'DELETE' })
    if (res.ok) carregar()
    else toast({ title: 'Erro ao excluir', variant: 'destructive' })
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Campos Personalizados</h1>
            <p className="text-xs text-slate-500">
              Informações extras dos seus contatos (ex.: Plano, Tamanho, Data do último serviço). Aparecem no CRM e no painel do chat.
            </p>
          </div>
          {!novo && (
            <Button size="sm" onClick={() => setNovo({ label: '', type: 'texto', options: '' })}>
              <Plus className="h-4 w-4 mr-1" /> Novo campo
            </Button>
          )}
        </div>

        {novo && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">Novo campo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Nome *</label>
                <Input className="mt-1" value={novo.label} maxLength={60} placeholder="Ex.: Plano" onChange={(e) => setNovo({ ...novo, label: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Tipo</label>
                <select
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                  value={novo.type}
                  onChange={(e) => setNovo({ ...novo, type: e.target.value as TipoCampo })}
                >
                  {(Object.keys(ROTULOS_TIPO) as TipoCampo[]).map((t) => <option key={t} value={t}>{ROTULOS_TIPO[t]}</option>)}
                </select>
              </div>
              {novo.type === 'lista' && (
                <div>
                  <label className="text-xs font-medium text-slate-600">Opções (separadas por vírgula)</label>
                  <Input className="mt-1" value={novo.options} placeholder="Ex.: Bronze, Prata, Ouro" onChange={(e) => setNovo({ ...novo, options: e.target.value })} />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={criar} disabled={salvando}><Save className="h-4 w-4 mr-1" /> Criar</Button>
                <Button size="sm" variant="outline" onClick={() => setNovo(null)} disabled={salvando}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {carregando ? (
          <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
        ) : campos.length === 0 && !novo ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="py-10 text-center space-y-2">
              <ListPlus className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600">Nenhum campo personalizado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {campos.map((c) => (
              <Card key={c.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{c.label}</p>
                    <p className="text-xs text-slate-500">
                      {ROTULOS_TIPO[c.type]}{c.type === 'lista' && c.options ? `: ${c.options.join(', ')}` : ''}
                      <span className="text-slate-300"> · variável de campanha: </span>
                      <code className="text-[11px]">{`{{campo:${c.key}}}`}</code>
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(c)}>
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
