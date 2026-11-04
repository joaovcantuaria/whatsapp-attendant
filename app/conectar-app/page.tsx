import { redirect } from 'next/navigation'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import { redirectUriPermitida } from '@/lib/app-link'
import { AutorizarApp } from '@/components/app-link/autorizar-app'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Conectar ao Bora Gerir App' }

type Params = Record<string, string | string[] | undefined>
const texto = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-[#F26522] rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Bora<span className="text-[#F26522]">Gerir</span>
          </span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">{children}</div>
      </div>
    </div>
  )
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <Moldura>
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Não foi possível conectar</h1>
        <p className="text-sm text-gray-500">{mensagem}</p>
      </div>
    </Moldura>
  )
}

/**
 * /conectar-app — tela de autorização do fluxo "Conectar com BoraGerir Chat",
 * aberta pelo Bora Gerir App. Sem login, o middleware manda para /login?next=...
 */
export default async function ConectarAppPage({ searchParams }: { searchParams: Params }) {
  const redirectUri = texto(searchParams.redirect_uri)
  const state = texto(searchParams.state)
  const codeChallenge = texto(searchParams.code_challenge)
  const empresaApp = texto(searchParams.empresa).slice(0, 120)

  if (!redirectUriPermitida(redirectUri) || !state || !codeChallenge) {
    return <Erro mensagem="Link de conexão inválido. Volte ao Bora Gerir App e clique em Conectar novamente." />
  }

  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const atual = new URLSearchParams(searchParams as Record<string, string>).toString()
    redirect(`/login?next=${encodeURIComponent(`/conectar-app?${atual}`)}`)
  }

  const serviceClient = createServiceRoleClient()
  const { data: membro } = await serviceClient
    .from('company_members')
    .select('role, companies(name, whatsapp_token, whatsapp_phone_number_id)')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()

  const empresa = (Array.isArray(membro?.companies) ? membro?.companies[0] : membro?.companies) as
    { name: string; whatsapp_token: string | null; whatsapp_phone_number_id: string | null } | null | undefined

  if (!membro || !empresa) {
    return <Erro mensagem="Sua conta ainda não tem uma empresa no BoraGerir Chat. Termine o cadastro e tente de novo." />
  }
  if (membro.role !== 'owner' && membro.role !== 'admin') {
    return <Erro mensagem="Só o dono ou um administrador da empresa no BoraGerir Chat pode fazer esta conexão." />
  }

  return (
    <Moldura>
      <AutorizarApp
        redirectUri={redirectUri}
        state={state}
        codeChallenge={codeChallenge}
        empresaApp={empresaApp}
        empresaChat={empresa.name}
        emailUsuario={session.user.email ?? ''}
        apiOficialConectada={!!empresa.whatsapp_token && !!empresa.whatsapp_phone_number_id}
      />
    </Moldura>
  )
}
