'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { CheckSquare, LayoutTemplate, Loader2, MessageSquare, Plus, Trash2, Zap } from 'lucide-react'

type Acao = 'criar_tarefa' | 'enviar_template' | 'enviar_texto'
interface Automacao { id: string; action: Acao; config: Record<string, unknown>; is_active: boolean }
interface Template { name: string; language: string; status: string }

const ROTULOS: Record<Acao, { titulo: string; icone: typeof Zap }> = {
  criar_tarefa: { titulo: 'Criar tarefa', icone: CheckSquare },
  enviar_template: { titulo: 'Enviar template do WhatsApp', icone: LayoutTemplate },
  enviar_texto: { titulo: 'Enviar texto (só até 24h após o cliente falar)', icone: MessageSquare },
}

function descrever(a: Automacao): string {
  if (a.action === 'criar_tarefa') return `"${a.config.titulo}" com prazo de ${a.config.prazo_dias || 0} dia(s)`
  if (a.action === 'enviar_template') return `Template "${a.config.template_name}"`
  return `"${String(a.config.texto || '').slice(0, 80)}"`
}

/** Diálogo do funil: automações que rodam quando um negócio entra nesta etapa. */
export function AutomacoesEtapa({ stageId, stageName, onClose }: { stageId: string; stageName: string; onClose: () => void }) {
  const { toast } = useToast()
  const [lista, setLista] = useState<Automacao[] | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [acao, setAcao] = useState<Acao | null>(null)
  const [form, setForm] = useState({ titulo: '', prazo_dias: '1', template_name: '', texto: '' })
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const res = await fetch(`/api/crm/automations?stage_id=${stageId}`)
    setLista(res.ok ? await res.json() : [])
  }

  useEffect(() => {
    carregar()
    fetch('/api/templates').then((r) => (r.ok ? r.json() : [])).then((t) => {
      const todos = Array.isArray(t) ? t : t?.templates || []
      setTemplates(todos.filter((x: Template) => x.status === 'approved'))
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId])

  const criar = async () => {
    if (!acao) return
    setSalvando(true)
    try {
      const tpl = templates.find((t) => t.name === form.template_name)
      const config = acao === 'criar_tarefa'
        ? { titulo: form.titulo, prazo_dias: Number(form.prazo_dias) }
        : acao === 'enviar_template'
          ? { template_name: form.template_name, template_language: tpl?.language || 'pt_BR' }
          : { texto: form.texto }
      const res = await fetch('/api/crm/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId, action: acao, config }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      setAcao(null)
      setForm({ titulo: '', prazo_dias: '1', template_name: '', texto: '' })
      carregar()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao criar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const alternar = async (a: Automacao) => {
    await fetch('/api/crm/automations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
    })
    carregar()
  }

  const excluir = async (a: Automacao) => {
    if (!confirm('Excluir esta automação?')) return
    await fetch(`/api/crm/automations?id=${a.id}`, { method: 'DELETE' })
    carregar()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Automações: {stageName}</DialogTitle>
          <DialogDescription className="text-xs">
            Rodam sempre que um negócio entra nesta etapa (criado aqui ou arrastado para cá). Tudo fica no histórico do contato.
          </DialogDescription>
        </DialogHeader>

        {lista === null ? (
          <p className="text-xs text-slate-400 py-4 text-center">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {lista.length === 0 && !acao && <p className="text-xs text-slate-400 py-2">Nenhuma automação nesta etapa.</p>}
            {lista.map((a) => {
              const Icone = ROTULOS[a.action].icone
              return (
                <div key={a.id} className={`flex items-start gap-2 rounded-lg border p-2.5 ${a.is_active ? '' : 'opacity-50'}`}>
                  <Icone className="h-4 w-4 mt-0.5 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">{ROTULOS[a.action].titulo}</p>
                    <p className="text-[11px] text-slate-500 truncate">{descrever(a)}</p>
                  </div>
                  <button className="text-[11px] text-slate-500 hover:text-slate-800" onClick={() => alternar(a)}>
                    {a.is_active ? 'Pausar' : 'Ativar'}
                  </button>
                  <button aria-label="Excluir" onClick={() => excluir(a)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                </div>
              )
            })}
          </div>
        )}

        {!acao ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(ROTULOS) as Acao[]).map((a) => (
              <Button key={a} size="sm" variant="outline" className="text-xs h-8" onClick={() => setAcao(a)}>
                <Plus className="h-3 w-3 mr-1" /> {ROTULOS[a].titulo.split(' (')[0]}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold text-slate-700">{ROTULOS[acao].titulo}</p>
            {acao === 'criar_tarefa' && (
              <div className="flex gap-2">
                <Input className="h-8 text-xs" placeholder="Ex.: Ligar para o cliente" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                <Input className="h-8 text-xs w-24" type="number" min={0} max={365} value={form.prazo_dias} onChange={(e) => setForm({ ...form, prazo_dias: e.target.value })} title="Prazo em dias" />
              </div>
            )}
            {acao === 'enviar_template' && (
              templates.length === 0 ? (
                <p className="text-xs text-amber-700">Nenhum template aprovado. Crie e sincronize em Templates.</p>
              ) : (
                <select className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs" value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })}>
                  <option value="">Escolha um template aprovado</option>
                  {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              )
            )}
            {acao === 'enviar_texto' && (
              <>
                <Textarea rows={3} className="text-xs" placeholder="Olá {{nome}}! Recebemos seu pedido e já estamos cuidando." value={form.texto} maxLength={1000} onChange={(e) => setForm({ ...form, texto: e.target.value })} />
                <p className="text-[11px] text-slate-400">Use {'{{nome}}'} para o primeiro nome. Fora da janela de 24h a Meta não entrega texto livre — prefira template.</p>
              </>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="h-8 text-xs" onClick={criar} disabled={salvando}>
                {salvando && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Salvar
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAcao(null)} disabled={salvando}>Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
