'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  MessageCircle,
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  LogOut,
  Building2,
  Wifi,
  CreditCard,
  Kanban,
  Bot,
  MessagesSquare,
  Settings,
  Shield,
  UserCircle,
  ListTodo,
  BarChart3,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const mainNavItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/conversations', icon: MessageCircle, label: 'Conversas' },
  { href: '/contacts', icon: Users, label: 'Contatos' },
]

const crmItems = [
  { href: '/crm', icon: Kanban, label: 'Pipeline' },
  { href: '/crm/tasks', icon: ListTodo, label: 'Tarefas' },
  { href: '/crm/reports', icon: BarChart3, label: 'Relatórios' },
  { href: '/crm/alerts', icon: Bell, label: 'Alertas' },
]

const toolsNavItems = [
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/agents', icon: UserCog, label: 'Agentes' },
  { href: '/ai-agent', icon: Bot, label: 'Agente IA' },
  { href: '/team-chat', icon: MessagesSquare, label: 'Chat Interno' },
]

const bottomNavItems = [
  { href: '/dashboard/supervisor', icon: Shield, label: 'Supervisor' },
  { href: '/settings/profile', icon: UserCircle, label: 'Meu Perfil' },
  { href: '/settings/whatsapp', icon: Wifi, label: 'WhatsApp' },
  { href: '/settings/company', icon: Building2, label: 'Empresa' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { agent } = useAuthStore()

  const handleLogout = async () => {
    if (agent) {
      await supabase.from('agents').update({ is_online: false }).eq('id', agent.id)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isCrmActive = pathname.startsWith('/crm')

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = pathname === href || (href !== '/dashboard' && href !== '/crm' && pathname.startsWith(href + '/'))
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} prefetch={true}>
            <div
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="w-[52px] flex flex-col h-full bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-slate-800">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <img src="/icon.png" alt="BG" className="h-5 w-5 object-contain" />
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
          {mainNavItems.map((item) => <NavItem key={item.href} {...item} />)}

          {/* CRM Group */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150',
                  isCrmActive
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Kanban className="h-[18px] w-[18px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" sideOffset={8} className="w-[130px] p-1.5 bg-slate-800 border-slate-700">
              {crmItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href} prefetch={true}>
                    <div
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors whitespace-nowrap',
                        isActive
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      <item.icon className="h-3 w-3" />
                      {item.label}
                    </div>
                  </Link>
                )
              })}
            </PopoverContent>
          </Popover>

          {/* Separator */}
          <div className="w-5 h-px bg-slate-700 my-1" />

          {toolsNavItems.map((item) => <NavItem key={item.href} {...item} />)}
        </nav>

        {/* Bottom Nav */}
        <div className="flex flex-col items-center py-3 gap-1 border-t border-slate-800">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link href={item.href} prefetch={true}>
                    <div
                      className={cn(
                        'w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150',
                        isActive
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                          : 'text-slate-500 hover:text-white hover:bg-slate-800'
                      )}
                    >
                      <item.icon className="h-[16px] w-[16px]" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all duration-150"
              >
                <LogOut className="h-[16px] w-[16px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="font-medium text-xs">
              Sair
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
