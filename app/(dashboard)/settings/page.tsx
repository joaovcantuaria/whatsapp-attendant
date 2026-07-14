'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  UserCircle,
  Building2,
  Wifi,
  Code2,
  CreditCard,
  Palette,
  Shield,
  ChevronRight,
  Instagram,
} from 'lucide-react'

const settingsItems = [
  {
    href: '/settings/profile',
    icon: UserCircle,
    title: 'Meu Perfil',
    description: 'Nome, mensagem de apresentação e cor do agente',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/settings/company',
    icon: Building2,
    title: 'Empresa',
    description: 'Nome, CNPJ, email e informações da empresa',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/settings/whatsapp',
    icon: Wifi,
    title: 'WhatsApp',
    description: 'Token, Phone Number ID e configuração da API Meta',
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/settings/integrations/instagram',
    icon: Instagram,
    title: 'Instagram Direct',
    description: 'Receba e responda mensagens do Direct no painel',
    color: 'bg-pink-50 text-pink-600',
  },
  {
    href: '/settings/integrations',
    icon: Code2,
    title: 'Integrações (API)',
    description: 'Chaves de API para conectar sistemas externos',
    color: 'bg-orange-50 text-orange-600',
  },
  {
    href: '/settings/billing',
    icon: CreditCard,
    title: 'Plano e Faturamento',
    description: 'Gerencie sua assinatura e limites de uso',
    color: 'bg-emerald-50 text-emerald-600',
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Configurações</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie sua conta, empresa e integrações</p>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-3">
          {settingsItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer group">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${item.color} shrink-0`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-800">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
