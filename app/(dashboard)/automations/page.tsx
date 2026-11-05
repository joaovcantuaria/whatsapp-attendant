'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { AlertTriangle, Cake, CalendarClock, Eye, Loader2, Power, Save, UserCheck, Zap } from 'lucide-react'
import { VARIAVEIS, VARIAVEIS_POR_TIPO, type TipoAutomacao } from '@/lib/automacoes-regras'

interface Automacao {
  type: TipoAutomacao
  is_active: boolean
  template_name: string | null
  template_language: string | null
  vars: string[]
  config: {
    hora_envio?: string
    limite_diario?: number
    dias_inatividade?: number
    antecedencia_horas?: number
    cupom?: { tipo: 'percentual' | 'fixo'; valor: number; validade_dias: number } | null
  }
  last_run_at?: string | null
}
interface Envio { automation_id: string; contact_name: string | null; status: string; detail: string | null; created_at: string }
interface Template { name: string; language: string; status: string; body: string | null }
interface Previa { total: number; alvos: { nome: string; telefone: string; situacao: string; detalhe: string }[] }

const INFO: Record<TipoAutomacao, { titulo: string; descricao: string; icone: typeof Cake; cor: string }> = {
  aniversario: { titulo: 'Aniversário', descricao: 'Parabeniza no dia do aniversário, com cupom de desconto opcional para usar no PDV.', icone: Cake, cor: 'bg-pink-50 text-pink-600' },
  reativacao: { titulo: 'Reativação', descricao: 'Chama de volta quem não aparece há um tempo (uma vez por "sumiço"), com cupom opcional.', icone: UserCheck, cor: 'bg-indigo-50 text-indigo-600' },
  lembrete_agendamento: { titulo: 'Lembrete de agendamento', descricao: 'Lembra o cliente do horário marcado, algumas horas antes.', icone: CalendarClock, cor: 'bg-emerald-50 text-emerald-600' },
}

const PADRAO: Record<TipoAutomacao, Automacao> = {
  aniversario: { type: 'aniversario', is_active: false, template_name: null, template_language: 'pt_BR', vars: ['nome', 'cupom', 'desconto'], config: { hora_envio: '09:00', limite_diario: 200, cupom: { tipo: 'percentual', valor: 10, validade_dias: 7 } } },
  reativacao: { type: 'reativacao', is_active: false, template_name: null, template_language: 'pt_BR', vars: ['nome', 'cupom', 'desconto'], config: { hora_envio: '10:00', limite_diario: 100, dias_inatividade: 60, cupom: { tipo: 'percentual', valor: 15, validade_dias: 10 } } },
  lembrete_agendamento: { type: 'lembrete_agendamento', is_active: false, template_name: null, template_language: 'pt_BR', vars: ['nome', 'servico', 'data', 'hora'], config: { limite_diario: 300, antecedencia_horas: 24 } },
}

const ROTULO_SITUACAO: Record<string, string> = { vai_receber: 'vai receber', ja_enviado: 'já recebeu', descadastrado: 'pediu SAIR' }

export default function AutomationsPage() {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [estado, setEstado] = useState<{ vinculado: boolean; empresa_nome: string | null; api_oficial: boolean; admin: boolean }>({ vinculado: false, empresa_nome: null, api_oficial: false, admin: false })
  const [automacoes, setAutomacoes] = useState<Record<TipoAutomacao, Automacao>>(PADRAO)
  const [ids, setIds] = useState<Record<string, TipoAutomacao>>({})
  const [envios, setEnvios] = useState<Envio[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [salvando, setSalvando] = useState<TipoAutomacao | null>(null)
  const [previa, setPrevia] = useState<{ tipo: TipoAutomacao; dados: Previa | null; carregando: boolean } | null>(null)

  const carregar = async () => {
    const [res, tpl] = await Promise.all([fetch('/api/automations'), fetch('/api/templates')])
    if (res.ok) {
      const d = await res.json()
      setEstado({ vinculado: d.vinculado, empresa_nome: d.empresa_nome, api_oficial: d.api_oficial, admin: d.admin })
      const proximo = { ...PADRAO }
      const mapaIds: Record<string, TipoAutomacao> = {}
      for (const a of d.automacoes as (Automacao & { id: string })[]) {
        proximo[a.type] = { ...PADRAO[a.type], ...a, config: { ...PADRAO[a.type].config, ...a.config }, vars: a.vars?.length ? a.vars : PADRAO[a.type].vars }
        mapaIds[a.id] = a.type
      }
      setAutomacoes(proximo)
      setIds(mapaIds)
      setEnvios(d.envios)
    }
    if (tpl.ok) {
      const t = await tpl.json()
      setTemplates((Array.isArray(t) ? t : t?.templates || []).filter((x: Template) => x.status === 'approved'))
    }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  const atualizar = (tipo: TipoAutomacao, mudanca: Partial<Automacao>) =>
    setAutomacoes((a) => ({ ...a, [tipo]: { ...a[tipo], ...mudanca } }))
  const atualizarConfig = (tipo: TipoAutomacao, mudanca: Partial<Automacao['config']>) =>
    setAutomacoes((a) => ({ ...a, [tipo]: { ...a[tipo], config: { ...a[tipo].config, ...mudanca } } }))

  const salvar = async (tipo: TipoAutomacao, ativar?: boolean) => {
    setSalvando(tipo)
    try {
      const a = automacoes[tipo]
      const res = await fetch('/api/automations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...a, is_active: ativar ?? a.is_active }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast({ title: ativar === undefined ? 'Automação salva' : ativar ? 'Automação ativada' : 'Automação pausada' })
      carregar()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(null)
    }
  }

  const verPrevia = async (tipo: TipoAutomacao) => {
    setPrevia({ tipo, dados: null, carregando: true })
    const cfg = automacoes[tipo].config
    const params = new URLSearchParams({ type: tipo, dias_inatividade: String(cfg.dias_inatividade || 60), antecedencia_horas: String(cfg.antecedencia_horas || 24) })
    const res = await fetch(`/api/automations/preview?${params}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: data.error || 'Não foi possível montar a prévia', variant: 'destructive' })
      setPrevia(null)
      return
    }
    setPrevia({ tipo, dados: data, carregando: false })
  }

  const envioPorTipo = useMemo(() => {
    const m: Record<string, Envio[]> = {}
    for (const e of envios) {
      const tipo = ids[e.automation_id]
      if (tipo) (m[tipo] ||= []).push(e)
    }
    return m
  }, [envios, ids])

  if (carregando) return <p className="p-6 text-sm text-slate-400 text-center">Carregando...</p>

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Zap className="h-5 w-5 text-[#F26522]" /> Automações</h1>
          <p className="text-xs text-slate-500">
            Mensagens automáticas com os dados reais do Bora Gerir App{estado.empresa_nome ? ` (${estado.empresa_nome})` : ''}. Saem por template aprovado,
            no máximo uma vez por ocasião, e nunca para quem pediu SAIR.
          </p>
        </div>

        {!estado.vinculado && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Conecte o Bora Gerir App para usar as automações: no App, abra <strong>Configurações → Chat</strong> e clique em <strong>Conectar com BoraGerir Chat</strong>.</span>
          </div>
        )}
        {!estado.api_oficial && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>As automações usam templates, que só funcionam pela <strong>API oficial do WhatsApp</strong> (Configurações → WhatsApp API Oficial).</span>
          </div>
        )}

        {(Object.keys(INFO) as TipoAutomacao[]).map((tipo) => {
          const a = automacoes[tipo]
          const info = INFO[tipo]
          const tpl = templates.find((t) => t.name === a.template_name)
          const qtdVars = new Set(tpl?.body?.match(/\{\{\d+\}\}/g) || []).size
          const Icone = info.icone
          const ultimos = (envioPorTipo[tipo] || []).slice(0, 5)
          return (
            <Card key={tipo} className="border-0 shadow-sm bg-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${info.cor}`}><Icone className="h-5 w-5" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{info.titulo}</p>
                    <p className="text-xs text-slate-500">{info.descricao}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={a.is_active ? 'default' : 'outline'}
                    className={a.is_active ? 'bg-green-600 hover:bg-green-700' : ''}
                    disabled={!estado.admin || salvando === tipo}
                    onClick={() => salvar(tipo, !a.is_active)}
                  >
                    <Power className="h-3.5 w-3.5 mr-1.5" /> {a.is_active ? 'Ativa' : 'Desativada'}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Template aprovado</label>
                    <select
                      className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                      value={a.template_name || ''}
                      onChange={(e) => {
                        const t = templates.find((x) => x.name === e.target.value)
                        atualizar(tipo, { template_name: e.target.value || null, template_language: t?.language || 'pt_BR' })
                      }}
                    >
                      <option value="">Escolha...</option>
                      {templates.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  {tipo !== 'lembrete_agendamento' ? (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Horário de envio (Brasília)</label>
                      <Input type="time" className="mt-1 h-9" value={a.config.hora_envio || '09:00'} onChange={(e) => atualizarConfig(tipo, { hora_envio: e.target.value })} />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Avisar com quantas horas de antecedência</label>
                      <Input type="number" min={1} max={72} className="mt-1 h-9" value={a.config.antecedencia_horas || 24} onChange={(e) => atualizarConfig(tipo, { antecedencia_horas: Number(e.target.value) })} />
                    </div>
                  )}
                  {tipo === 'reativacao' && (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Sem visita há quantos dias</label>
                      <Input type="number" min={15} max={730} className="mt-1 h-9" value={a.config.dias_inatividade || 60} onChange={(e) => atualizarConfig(tipo, { dias_inatividade: Number(e.target.value) })} />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-slate-600">Limite de envios por dia</label>
                    <Input type="number" min={1} max={1000} className="mt-1 h-9" value={a.config.limite_diario || 200} onChange={(e) => atualizarConfig(tipo, { limite_diario: Number(e.target.value) })} />
                  </div>
                </div>

                {tpl && (
                  <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                    <p className="text-xs text-slate-500 whitespace-pre-wrap">{tpl.body}</p>
                    {qtdVars === 0 ? (
                      <p className="text-[11px] text-slate-400">Este template não tem variáveis.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Array.from({ length: qtdVars }, (_, i) => (
                          <label key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <code className="text-[11px] w-10">{`{{${i + 1}}}`}</code>
                            <select
                              className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                              value={a.vars[i] || ''}
                              onChange={(e) => {
                                const vars = [...a.vars]
                                vars[i] = e.target.value
                                atualizar(tipo, { vars: vars.slice(0, qtdVars) })
                              }}
                            >
                              <option value="">—</option>
                              {VARIAVEIS_POR_TIPO[tipo].map((v) => <option key={v} value={v}>{VARIAVEIS[v]}</option>)}
                            </select>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tipo !== 'lembrete_agendamento' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!a.config.cupom}
                        onChange={(e) => atualizarConfig(tipo, { cupom: e.target.checked ? { tipo: 'percentual', valor: 10, validade_dias: 7 } : null })}
                      />
                      Gerar cupom de desconto no App (resgatado no PDV)
                    </label>
                    {a.config.cupom && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <Input type="number" min={1} className="h-8 w-24" value={a.config.cupom.valor}
                          onChange={(e) => atualizarConfig(tipo, { cupom: { ...a.config.cupom!, valor: Number(e.target.value) } })} />
                        <select className="h-8 rounded-md border border-slate-200 bg-white px-2" value={a.config.cupom.tipo}
                          onChange={(e) => atualizarConfig(tipo, { cupom: { ...a.config.cupom!, tipo: e.target.value as 'percentual' | 'fixo' } })}>
                          <option value="percentual">% de desconto</option>
                          <option value="fixo">reais de desconto</option>
                        </select>
                        <span>válido por</span>
                        <Input type="number" min={1} max={90} className="h-8 w-20" value={a.config.cupom.validade_dias}
                          onChange={(e) => atualizarConfig(tipo, { cupom: { ...a.config.cupom!, validade_dias: Number(e.target.value) } })} />
                        <span>dias</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => salvar(tipo)} disabled={!estado.admin || salvando === tipo}>
                    {salvando === tipo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => verPrevia(tipo)} disabled={!estado.vinculado}>
                    <Eye className="h-4 w-4 mr-1" /> Ver quem recebe agora
                  </Button>
                </div>

                {previa?.tipo === tipo && (
                  <div className="rounded-lg border p-3 text-xs space-y-1">
                    {previa.carregando ? (
                      <p className="text-slate-400">Consultando o App...</p>
                    ) : previa.dados && (
                      <>
                        <p className="font-medium text-slate-700">{previa.dados.total} cliente(s) agora · nada foi enviado</p>
                        {previa.dados.alvos.slice(0, 15).map((x, i) => (
                          <p key={i} className="text-slate-500">{x.nome} · {x.telefone} · {x.detalhe && `${x.detalhe} · `}<strong>{ROTULO_SITUACAO[x.situacao]}</strong></p>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {ultimos.length > 0 && (
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-medium text-slate-600">Últimos envios</p>
                    {ultimos.map((e, i) => (
                      <p key={i}>
                        {new Date(e.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {e.contact_name || 'cliente'} ·{' '}
                        <span className={e.status === 'sent' ? 'text-green-600' : e.status === 'failed' ? 'text-red-500' : 'text-slate-400'}>{e.detail}</span>
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
