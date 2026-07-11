'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { CompanyProvider } from '@/hooks/use-company'
import { Sidebar } from '@/components/shared/sidebar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const { setAgent, setIsLoading } = useAuthStore()

  useEffect(() => {
    const getAgent = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Buscar agente existente
      let { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Se não existe, criar registro do agente automaticamente
      if (!agent) {
        const { data: newAgent } = await supabase
          .from('agents')
          .insert({
            id: session.user.id,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            email: session.user.email || '',
            role: 'admin',
            is_online: true,
          })
          .select()
          .single()

        agent = newAgent
      } else {
        // Atualizar status online
        await supabase
          .from('agents')
          .update({ is_online: true })
          .eq('id', session.user.id)
      }

      if (agent) {
        setAgent(agent)
      }
      setIsLoading(false)
    }

    getAgent()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          setAgent(null)
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, setAgent, setIsLoading, supabase])

  return (
    <CompanyProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </CompanyProvider>
  )
}
