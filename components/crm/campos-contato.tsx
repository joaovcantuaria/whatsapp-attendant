'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save, Settings2 } from 'lucide-react'
import type { DefinicaoCampo } from '@/lib/campos-personalizados'

interface Props {
  contactId: string
  valores: Record<string, string | number> | null | undefined
  compacto?: boolean
}

/** Editor dos campos personalizados de um contato (CRM e painel do chat). */
export function CamposContato({ contactId, valores: iniciais, compacto }: Props) {
  const { toast } = useToast()
  const [defs, setDefs] = useState<DefinicaoCampo[] | null>(null)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    fetch('/api/contact-fields').then((r) => (r.ok ? r.json() : [])).then(setDefs).catch(() => setDefs([]))
  }, [])

  useEffect(() => {
    setValores(Object.fromEntries(Object.entries(iniciais || {}).map(([k, v]) => [k, String(v)])))
  }, [iniciais, contactId])

  const salvar = async () => {
    setSalvando(true)
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: valores }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast({ title: 'Campos salvos' })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  if (defs === null) return <p className="text-xs text-slate-400">Carregando...</p>
  if (defs.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        Nenhum campo personalizado.{' '}
        <Link href="/settings/contact-fields" className="text-[#F26522] hover:underline">Criar campos</Link>
      </p>
    )
  }

  return (
    <div className={compacto ? 'space-y-2' : 'space-y-3'}>
      {defs.map((def) => (
        <div key={def.id}>
          <label className="text-[11px] font-medium text-slate-500">{def.label}</label>
          {def.type === 'lista' ? (
            <select
              className="mt-0.5 w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              value={valores[def.key] || ''}
              onChange={(e) => setValores({ ...valores, [def.key]: e.target.value })}
            >
              <option value="">—</option>
              {(def.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input
              className="mt-0.5 h-8 text-xs"
              type={def.type === 'data' ? 'date' : def.type === 'numero' ? 'number' : 'text'}
              value={valores[def.key] || ''}
              onChange={(e) => setValores({ ...valores, [def.key]: e.target.value })}
            />
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={salvar} disabled={salvando} className="h-7 text-xs">
          {salvando ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Salvar campos
        </Button>
        <Link href="/settings/contact-fields" className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
          <Settings2 className="h-3 w-3" /> Gerenciar
        </Link>
      </div>
    </div>
  )
}
