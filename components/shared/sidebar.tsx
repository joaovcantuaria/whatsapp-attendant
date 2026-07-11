'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { useCompany } from '@/hooks/use-company'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Settings,
  LogOut,
  Zap,
  Building2,
  Wifi,
  CreditCard,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/conversations', icon: MessageCircle, label: 'Conversas' },
  { href: '/contacts', icon: Users, label: 'Contatos' },
  { href: '/templates', icon: FileText, label: 'Templates' },
  { href: '/agents', icon: UserCog, label: 'Agentes' },
]

const settingsItems = [
  { href: '/settings/company', icon: Building2, label: 'Empresa' },
  { href: '/settings/whatsapp', icon: Wifi, label: 'WhatsApp' },
  { href: '/settings/billing', icon: CreditCard, label: 'Plano' },
]

export function Sidebar() {
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
    <aside className="w-16 lg:w-64 border-r bg-card flex flex-col h-full">
      {/* Company Header */}
      <div className="h-16 flex items-center px-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BoraGerir" style={{ height: '32px' }} className="shrink-0 hidden lg:block" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="BoraGerir" style={{ height: '28px', width: '28px', objectFit: 'contain' }} className="shrink-0 lg:hidden" />
          <div className="hidden lg:block min-w-0">
            <p className="font-semibold text-sm truncate">{company?.name || 'BoraGerir'}</p>
            <div className="flex items-center gap-1">
              {company?.plan_status === 'trial' && trialDaysLeft !== null && (
                <Badge variant="warning" className="text-[9px] px-1 py-0">
                  Trial • {trialDaysLeft}d
                </Badge>
              )}
              {company?.plan_status === 'active' && plan && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                  {plan.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-3', isActive && 'bg-primary/10 text-primary')}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="hidden lg:block">{item.label}</span>
              </Button>
            </Link>
          )
        })}

        <Separator className="my-2" />

        <p className="text-[10px] uppercase text-muted-foreground px-3 py-1 hidden lg:block">
          Configurações
        </p>

        {settingsItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-3', isActive && 'bg-primary/10 text-primary')}
                size="sm"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:block text-xs">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* User */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 h-12">
              <Avatar className="h-8 w-8">
                <AvatarImage src={agent?.avatar_url || ''} />
                <AvatarFallback className="text-xs">
                  {agent?.name ? getInitials(agent.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left min-w-0">
                <p className="text-sm font-medium truncate">{agent?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{agent?.email}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => router.push('/settings/company')}>
              <Building2 className="mr-2 h-4 w-4" />
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
  )
}
