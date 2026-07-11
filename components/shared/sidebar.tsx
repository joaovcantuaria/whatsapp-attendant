'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/conversations', icon: MessageCircle, label: 'Conversas' },
  { href: '/crm', icon: Kanban, label: 'CRM' },
  { href: '/contacts', icon: Users, label: 'Contatos' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/agents', icon: UserCog, label: 'Agentes' },
  { href: '/ai-agent', icon: Bot, label: 'Agente IA' },
  { href: '/team-chat', icon: MessagesSquare, label: 'Chat Interno' },
]

const settingsItems = [
  { href: '/settings/company', icon: Building2, label: 'Empresa' },
  { href: '/settings/whatsapp', icon: Wifi, label: 'WhatsApp' },
  { href: '/settings/billing', icon: CreditCard, label: 'Plano' },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { agent } = useAuthStore()
  const { company, plan, trialDaysLeft } = useCompany()

  const handleLogout = async () => {
    if (agent) {
      await supabase.from('agents').update({ is_online: false }).eq('id', agent.id)
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex flex-col h-full bg-slate-900 text-white transition-all duration-300 ease-in-out',
          isExpanded ? 'w-64' : 'w-[68px]'
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-slate-900 shadow-md hover:bg-slate-50 transition-colors"
        >
          {isExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Logo / Company Header */}
        <div className={cn('h-16 flex items-center border-b border-slate-700/50 px-4', !isExpanded && 'justify-center px-0')}>
          {isExpanded ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                <img src="/icon.png" alt="BoraGerir" className="h-6 w-6 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate text-white">
                  {company?.name || 'BoraGerir'}
                </p>
                {company?.plan_status === 'trial' && trialDaysLeft !== null && (
                  <span className="text-[10px] text-emerald-400">
                    Trial • {trialDaysLeft} dias
                  </span>
                )}
                {company?.plan_status === 'active' && plan && (
                  <span className="text-[10px] text-emerald-400">{plan.name}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <img src="/icon.png" alt="BoraGerir" className="h-6 w-6 object-contain" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            const linkContent = (
              <Link key={item.href} href={item.href} prefetch={true}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800',
                    !isExpanded && 'justify-center px-0'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-emerald-400')} />
                  {isExpanded && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                  {isActive && isExpanded && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
              </Link>
            )

            if (!isExpanded) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}

          <div className="py-2">
            <Separator className="bg-slate-700/50" />
          </div>

          {isExpanded && (
            <p className="text-[10px] uppercase text-slate-500 px-3 py-1 font-semibold tracking-wider">
              Configurações
            </p>
          )}

          {settingsItems.map((item) => {
            const isActive = pathname === item.href

            const linkContent = (
              <Link key={item.href} href={item.href} prefetch={true}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800',
                    !isExpanded && 'justify-center px-0'
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-emerald-400')} />
                  {isExpanded && (
                    <span className="text-xs font-medium">{item.label}</span>
                  )}
                </div>
              </Link>
            )

            if (!isExpanded) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return linkContent
          })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-slate-700/50 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition-colors',
                  !isExpanded && 'justify-center'
                )}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={agent?.avatar_url || ''} />
                    <AvatarFallback className="bg-slate-700 text-xs text-white">
                      {agent?.name ? getInitials(agent.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900" />
                </div>
                {isExpanded && (
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{agent?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{agent?.role === 'admin' ? 'Administrador' : 'Agente'}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/settings/company')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}
