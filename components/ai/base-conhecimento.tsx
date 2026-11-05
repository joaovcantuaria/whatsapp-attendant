'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { BookOpen, Globe, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'

interface Documento {
  id: string
  title: string
  content: string
  source_url: string | null
  updated_at: string
}

type Modo = { tipo: 'texto'; id?: string; title: string; content: string } | { tipo: 'site'; url: string }

/** Aba "Base de conhecimento" do Agente de IA: textos/FAQs e páginas do site que a IA consulta. */
export function BaseConhecimento() {
  const { toast } = useToast()
  const [docs, setDocs] = useState<Documento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [modo, setModo] = useState<Modo | null>(null)

  const carregar = async () => {
    const res = await fetch('/api/ai-knowledge')
    if (res.ok) setDocs(await res.json())
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!modo) return
    setSalvando(true)
    try {
      const editando = modo.tipo === 'texto' && modo.id
      const res = await fetch('/api/ai-knowledge', {
        method: editando ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modo.tipo === 'site' ? { url: modo.url } : { id: modo.id, title: modo.title, content: modo.content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
      toast({ title: modo.tipo === 'site' ? 'Página importada' : 'Documento salvo' })
      setModo(null)
      carregar()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (doc: Documento) => {
    if (!confirm(`Excluir "${doc.title}" da base de conhecimento?`)) return
    const res = await fetch(`/api/ai-knowledge?id=${doc.id}`, { method: 'DELETE' })
    if (res.ok) carregar()
    else toast({ title: 'Erro ao excluir', variant: 'destructive' })
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4 text-[#F26522]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">O que a IA precisa saber sobre a sua empresa</p>
              <p className="text-xs text-slate-500">
                Preços, horários, endereço, formas de pagamento, políticas e perguntas frequentes. A cada mensagem, a IA
                consulta os trechos mais parecidos com a pergunta do cliente — e não inventa o que não estiver aqui.
              </p>
            </div>
          </div>
          {!modo && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setModo({ tipo: 'texto', title: '', content: '' })}>
                <Plus className="h-4 w-4 mr-1" /> Texto ou FAQ
              </Button>
              <Button size="sm" variant="outline" onClick={() => setModo({ tipo: 'site', url: '' })}>
                <Globe className="h-4 w-4 mr-1" /> Importar página do site
              </Button>
            </div>
          )}

          {modo?.tipo === 'texto' && (
            <div className="space-y-2">
              <Input
                placeholder="Título (ex.: Tabela de preços)"
                value={modo.title}
                maxLength={120}
                onChange={(e) => setModo({ ...modo, title: e.target.value })}
              />
              <Textarea
                placeholder={'Ex.:\nCorte feminino: R$ 80\nEscova: R$ 50\n\nPergunta: Vocês aceitam Pix?\nResposta: Sim, aceitamos Pix e cartão.'}
                rows={10}
                value={modo.content}
                maxLength={50000}
                onChange={(e) => setModo({ ...modo, content: e.target.value })}
              />
            </div>
          )}

          {modo?.tipo === 'site' && (
            <div className="space-y-1">
              <Input
                placeholder="https://www.seusite.com.br/servicos"
                value={modo.url}
                onChange={(e) => setModo({ ...modo, url: e.target.value })}
              />
              <p className="text-xs text-slate-400">Importamos o texto dessa página (uma por vez). Você pode editar depois.</p>
            </div>
          )}

          {modo && (
            <div className="flex gap-2">
              <Button size="sm" onClick={salvar} disabled={salvando}>
                {salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {modo.tipo === 'site' ? 'Importar' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setModo(null)} disabled={salvando}>
                <X className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {carregando ? (
        <p className="text-sm text-slate-400 text-center py-6">Carregando...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Nenhum documento ainda. Comece pela sua tabela de preços e horários.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <Card key={doc.id} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-start gap-3">
                {doc.source_url ? <Globe className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" /> : <BookOpen className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{doc.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {doc.content.length.toLocaleString('pt-BR')} caracteres{doc.source_url ? ` · ${doc.source_url}` : ''}
                  </p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setModo({ tipo: 'texto', id: doc.id, title: doc.title, content: doc.content })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(doc)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
