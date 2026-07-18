'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { CompanyProvider } from '@/hooks/use-company'
import { Sidebar } from '@/components/shared/sidebar'
import { MessageCircle, LayoutDashboard, Users, Settings } from 'lucide-react'
import { useConversationStore } from '@/store/conversation-store'

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
      <div className="flex flex-col md:flex-row h-screen overflow-hidden p-0 md:p-2 gap-0 md:gap-2 bg-slate-900">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-hidden bg-slate-50 md:rounded-2xl pb-[72px] md:pb-0">
          {children}
        </main>
        {/* Mobile bottom navigation - hidden when chat is open */}
        <MobileNav hide={false} />
      </div>
    </CompanyProvider>
  )
}

function MobileNav({ hide }: { hide?: boolean }) {
  const pathname = usePathname()
  const { selectedConversation } = useConversationStore()

  // Hide when inside a chat on mobile
  if (selectedConversation && pathname?.includes('/conversations')) return null
  if (hide) return null

  const items = [
    { href: '/conversations', icon: MessageCircle, label: 'Chat' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { href: '/contacts', icon: Users, label: 'Contatos' },
    { href: '/settings', icon: Settings, label: 'Config' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="flex items-center justify-around h-12 mb-2">
        {items.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-[#F26522]' : 'text-slate-400'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="h-4 bg-white" />
    </nav>
  )
}
