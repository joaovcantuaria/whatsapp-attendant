'use client'

import { useState } from 'react'
import { Link2, Loader2, Cake, UserCheck, ShieldCheck, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  redirectUri: string
  state: string
  codeChallenge: string
  empresaApp: string
  empresaChat: string
  emailUsuario: string
  apiOficialConectada: boolean
}

export function AutorizarApp({ redirectUri, state, codeChallenge, empresaApp, empresaChat, emailUsuario, apiOficialConectada }: Props) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function autorizar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/app-link/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_uri: redirectUri, state, code_challenge: codeChallenge }),
      })
      const corpo = await res.json().catch(() => ({}))
      if (!res.ok || !corpo.redirect_to) throw new Error(corpo.error || 'Erro ao autorizar')
      window.location.href = corpo.redirect_to
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao autorizar')
      setLoading(false)
    }
  }

  function cancelar() {
    const volta = new URL(redirectUri)
    volta.searchParams.set('error', 'access_denied')
    volta.searchParams.set('state', state)
    window.location.href = volta.toString()
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Link2 className="w-5 h-5 text-[#F26522]" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Conectar ao Bora Gerir App</h1>
        <p className="text-sm text-gray-500 mt-1">
          {empresaApp ? <><strong>{empresaApp}</strong> quer</> : 'O Bora Gerir App quer'} se conectar
          ao WhatsApp de <strong>{empresaChat}</strong>.
        </p>
      </div>

      <div className="space-y-2.5 text-sm text-gray-600">
        <p className="font-medium text-gray-900">O BoraGerir Chat poderá:</p>
        <p className="flex gap-2"><Cake className="w-4 h-4 mt-0.5 shrink-0 text-[#F26522]" />Consultar aniversários dos seus clientes</p>
        <p className="flex gap-2"><UserCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#F26522]" />Ver histórico de visitas para reativar quem sumiu</p>
        <p className="flex gap-2"><ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#F26522]" />CPF, e-mail e dados financeiros da empresa não são compartilhados</p>
      </div>

      {!apiOficialConectada && (
        <p className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Smartphone className="w-4 h-4 shrink-0" />
          As mensagens automáticas (aniversário, reativação) usam templates da API oficial do WhatsApp,
          que não funcionam pelo QR Code. Configure a API oficial em Configurações → WhatsApp.
          A conexão com o App pode ser feita agora.
        </p>
      )}

      {erro && <p className="text-sm text-red-600 text-center">{erro}</p>}

      <div className="space-y-2">
        <Button onClick={autorizar} disabled={loading} className="w-full h-10 bg-[#F26522] hover:bg-[#d4561c] text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autorizar'}
        </Button>
        <Button onClick={cancelar} disabled={loading} variant="outline" className="w-full h-10">
          Cancelar
        </Button>
      </div>

      <p className="text-xs text-gray-400 text-center">Conectado como {emailUsuario}</p>
    </div>
  )
}
