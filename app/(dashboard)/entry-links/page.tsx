'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { useDepartments } from '@/hooks/use-departments'
import { linkWhatsApp, mensagemComCodigo } from '@/lib/links-entrada'
import { Copy, Download, Link2, Plus, QrCode, Save, Trash2, X } from 'lucide-react'

interface LinkEntrada {
  id: string
  name: string
  code: string
  phone: string
  message: string
  department_id: string | null
  tag: string | null
  uses: number
}

function QrDoLink({ url, nome }: { url: string; nome: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(url, { width: 320, margin: 1 }).then(setSrc).catch(() => setSrc('')) }, [url])
  if (!src) return null
  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`QR Code do link ${nome}`} className="h-28 w-28 rounded border" />
      <a href={src} download={`qr-${nome.toLowerCase().replace(/\s+/g, '-')}.png`} className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1">
        <Download className="h-3 w-3" /> Baixar QR
      </a>
    </div>
  )
}

export default function EntryLinksPage() {
  const { toast } = useToast()
  const { departments } = useDepartments()
  const [links, setLinks] = useState<LinkEntrada[]>([])
  const [telefoneEmpresa, setTelefoneEmpresa] = useState('')
  const [admin, setAdmin] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [novo, setNovo] = useState<{ name: string; phone: string; message: string; department_id: string; tag: string } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    const res = await fetch('/api/entry-links')
    if (res.ok) {
      const d = await res.json()
      setLinks(d.links)
      setTelefoneEmpresa(d.telefone_empresa)
      setAdmin(d.admin)
    }
    setCarregando(false)
  }
  useEffect(() => { carregar() }, [])

  const criar = async () => {
    if (!novo) return
    setSalvando(true)
    try {
      const res = await fetch('/api/entry-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novo) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erro ao criar')
      toast({ title: 'Link criado' })
      setNovo(null)
      carregar()
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao criar', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (l: LinkEntrada) => {
    if (!confirm(`Excluir o link "${l.name}"? Quem já tem o link impresso continuará caindo no WhatsApp, mas sem a origem registrada.`)) return
    await fetch(`/api/entry-links?id=${l.id}`, { method: 'DELETE' })
    carregar()
  }

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto).catch(() => {})
    toast({ title: 'Link copiado' })
  }

  return (
    <div className="p-6 space-y-5 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Link2 className="h-5 w-5 text-[#F26522]" /> Links de entrada</h1>
            <p className="text-xs text-slate-500">
              Links e QR Codes para Instagram, panfletos, site ou anúncios. A mensagem pronta leva um código: o Chat sabe de onde o cliente veio,
              aplica a etiqueta e manda a conversa para o departamento certo.
            </p>
          </div>
          {admin && !novo && (
            <Button size="sm" onClick={() => setNovo({ name: '', phone: telefoneEmpresa.replace(/\D/g, ''), message: 'Olá! Quero mais informações.', department_id: '', tag: '' })}>
              <Plus className="h-4 w-4 mr-1" /> Novo link
            </Button>
          )}
        </div>

        {novo && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-700">Novo link</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nome (de onde vem) *</label>
                  <Input className="mt-1" placeholder="Ex.: Instagram" value={novo.name} maxLength={60} onChange={(e) => setNovo({ ...novo, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">WhatsApp que recebe (DDI + DDD + número) *</label>
                  <Input className="mt-1" placeholder="5538999999999" value={novo.phone} onChange={(e) => setNovo({ ...novo, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Mensagem que o cliente envia *</label>
                <Input className="mt-1" value={novo.message} maxLength={300} onChange={(e) => setNovo({ ...novo, message: e.target.value })} />
                <p className="text-[11px] text-slate-400 mt-1">O código (ex.: #INSTA7) é colocado no fim automaticamente.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-600">Departamento (opcional)</label>
                  <select className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={novo.department_id} onChange={(e) => setNovo({ ...novo, department_id: e.target.value })}>
                    <option value="">Padrão</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Etiqueta no contato (opcional)</label>
                  <Input className="mt-1" placeholder="Ex.: veio-do-instagram" value={novo.tag} maxLength={40} onChange={(e) => setNovo({ ...novo, tag: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={criar} disabled={salvando}><Save className="h-4 w-4 mr-1" /> Criar</Button>
                <Button size="sm" variant="outline" onClick={() => setNovo(null)} disabled={salvando}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {carregando ? (
          <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
        ) : links.length === 0 && !novo ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="py-10 text-center space-y-2">
              <QrCode className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600">Nenhum link ainda. Crie um para o Instagram ou para o balcão da loja.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {links.map((l) => {
              const url = linkWhatsApp(l.phone, l.message, l.code)
              const dep = departments.find((d) => d.id === l.department_id)
              return (
                <Card key={l.id} className="border-0 shadow-sm bg-white">
                  <CardContent className="p-4 flex items-start gap-4">
                    <QrDoLink url={url} nome={l.name} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{l.name} <code className="text-[11px] text-slate-400">#{l.code}</code></p>
                      <p className="text-xs text-slate-500 truncate">“{mensagemComCodigo(l.message, l.code)}”</p>
                      <p className="text-[11px] text-slate-400">
                        {l.uses} contato(s) chegaram por aqui{dep ? ` · departamento ${dep.name}` : ''}{l.tag ? ` · etiqueta ${l.tag}` : ''}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copiar(url)}><Copy className="h-3 w-3 mr-1" /> Copiar link</Button>
                        {admin && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => excluir(l)}><Trash2 className="h-3 w-3 mr-1" /> Excluir</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
