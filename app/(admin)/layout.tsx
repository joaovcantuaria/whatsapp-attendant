'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Ticket,
  BarChart3,
  Activity,
  Building2,
  Lightbulb,
  HeadphonesIcon,
  MessageCircle,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/clients', icon: Users, label: 'Clientes' },
  { href: '/admin/companies', icon: Building2, label: 'Empresas' },
  { href: '/admin/subscriptions', icon: CreditCard, label: 'Assinaturas' },
  { href: '/admin/coupons', icon: Ticket, label: 'Cupons' },
  { href: '/admin/insights', icon: BarChart3, label: 'Insights' },
  { href: '/admin/activity', icon: Activity, label: 'Movimentações' },
  { href: '/admin/solutions', icon: Lightbulb, label: 'Soluções' },
  { href: '/admin/support', icon: HeadphonesIcon, label: 'Suporte' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden p-2 md:p-3 gap-2 md:gap-3 bg-slate-900">
        {/* Desktop Sidebar — flutuante */}
        <aside className="hidden md:flex w-[56px] flex-col h-full bg-slate-800/80 backdrop-blur-xl rounded-2xl shrink-0 overflow-hidden border border-slate-700/30 shadow-2xl shadow-black/20">
          {/* Logo */}
          <div className="h-14 flex items-center justify-center">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link href={item.href} prefetch={true}>
                      <div
                        className={cn(
                          'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200',
                          isActive
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105'
                            : 'text-slate-400 hover:text-white hover:bg-white/10 hover:scale-105'
                        )}
                      >
                        <item.icon className="h-[18px] w-[18px]" />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="font-medium text-xs bg-slate-800 border-slate-700 text-white">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>

          {/* Bottom */}
          <div className="flex flex-col items-center py-3 gap-1 border-t border-slate-700/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/conversations" prefetch={true}>
                  <div className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-105">
                    <MessageCircle className="h-[16px] w-[16px]" />
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="font-medium text-xs bg-slate-800 border-slate-700 text-white">
                Ir para o Chat
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-105"
                >
                  <LogOut className="h-[16px] w-[16px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="font-medium text-xs bg-slate-800 border-slate-700 text-white">
                Sair
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Mobile Header — flutuante */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/30 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Admin</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400 hover:text-white transition-colors">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        {mobileOpen && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            <div className="md:hidden fixed top-3 left-3 bottom-3 w-64 bg-slate-800/95 backdrop-blur-xl z-50 p-4 space-y-1 rounded-2xl border border-slate-700/30 shadow-2xl overflow-y-auto">
              <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-700/30">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">BoraGerir</span>
                  <span className="text-[10px] text-slate-400">Admin Panel</span>
                </div>
              </div>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
              <div className="pt-4 mt-4 border-t border-slate-700/30 space-y-1">
                <Link
                  href="/conversations"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ir para o Chat
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 w-full transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          </>
        )}

        {/* Main Content — flutuante */}
        <main className="flex-1 overflow-auto bg-white/95 backdrop-blur-xl md:rounded-2xl rounded-2xl border border-slate-200/50 shadow-2xl shadow-black/10">
          <div className="p-5 lg:p-7">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
