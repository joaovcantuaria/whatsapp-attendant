'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { SettingsBack } from '@/components/shared/settings-back'
import { DIAS_SEMANA, MENSAGEM_AUSENCIA_PADRAO } from '@/lib/ausencia'
import { Save, Loader2, AlertTriangle } from 'lucide-react'

type Dia = { aberto: boolean; inicio: string; fim: string }

// Padrão sugerido: seg-sex 08-18, sáb 08-12, domingo fechado
const PADRAO: Dia[] = DIAS_SEMANA.map((_, i) => ({
  aberto: i >= 1 && i <= 6,
  inicio: '08:00',
  fim: i === 6 ? '12:00' : '18:00',
}))

export default function BusinessHoursSettingsPage() {
  const { toast } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [usarHorario, setUsarHorario] = useState(false)
  const [dias, setDias] = useState<Dia[]>(PADRAO)
  const [ausenciaAtiva, setAusenciaAtiva] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [apiOficial, setApiOficial] = useState(true)

  useEffect(() => {
    fetch('/api/business-hours')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        if (d.business_hours) {
          setUsarHorario(true)
          setDias(DIAS_SEMANA.map((_, i) => {
            const faixa = d.business_hours[String(i)]
            return faixa ? { aberto: true, inicio: faixa[0], fim: faixa[1] } : { ...PADRAO[i], aberto: false }
          }))
        }
        setAusenciaAtiva(d.away_enabled)
        setMensagem(d.away_message || '')
        setApiOficial(d.api_oficial)
      })
      .finally(() => setCarregando(false))
  }, [])

  const alterarDia = (i: number, mudanca: Partial<Dia>) =>
    setDias((atual) => atual.map((d, j) => (j === i ? { ...d, ...mudanca } : d)))

  const salvar = async () => {
    setSalvando(true)
    try {
      const business_hours = usarHorario
        ? Object.fromEntries(dias.map((d, i) => [String(i), d.aberto ? [d.inicio, d.fim] : null]))
        : null
      const res = await fetch('/api/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_hours, away_enabled: usarHorario && ausenciaAtiva, away_message: mensagem }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast({ title: 'Horário salvo' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return <p className="p-6 text-sm text-slate-400 text-center">Carregando...</p>
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-5">
        <SettingsBack />
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Horário de Atendimento</h1>
          <p className="text-xs text-slate-500">
            Defina quando sua equipe atende. Fora desse horário, o cliente recebe automaticamente uma mensagem de ausência.
          </p>
        </div>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Dias e horários (horário de Brasília)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={usarHorario} onChange={(e) => setUsarHorario(e.target.checked)} />
              Usar horário de atendimento
            </label>

            {usarHorario && (
              <div className="space-y-2">
                {dias.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <label className="flex items-center gap-2 w-28 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={d.aberto} onChange={(e) => alterarDia(i, { aberto: e.target.checked })} />
                      {DIAS_SEMANA[i]}
                    </label>
                    {d.aberto ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" value={d.inicio} onChange={(e) => alterarDia(i, { inicio: e.target.value })} className="h-8 w-28" />
                        <span className="text-xs text-slate-400">até</span>
                        <Input type="time" value={d.fim} onChange={(e) => alterarDia(i, { fim: e.target.value })} className="h-8 w-28" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Fechado</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {usarHorario && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">Mensagem de ausência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={ausenciaAtiva} onChange={(e) => setAusenciaAtiva(e.target.checked)} />
                Responder automaticamente fora do horário
              </label>
              {ausenciaAtiva && (
                <>
                  <Textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder={MENSAGEM_AUSENCIA_PADRAO}
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-slate-400">
                    Enviada no máximo uma vez a cada 12 horas para o mesmo cliente. Em branco, usamos a mensagem sugerida.
                  </p>
                  {!apiOficial && (
                    <p className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      A resposta automática funciona com a API oficial do WhatsApp. No QR Code ela ainda não é enviada.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  )
}
