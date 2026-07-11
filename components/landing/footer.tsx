'use client'

import Link from 'next/link'
import { LOGO_BASE64 } from '@/lib/logo-base64'
import { Instagram, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer id="sobre" className="relative bg-gray-900 text-white pt-20 pb-8 overflow-hidden">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span className="text-[12rem] md:text-[18rem] font-black text-white/[0.02] whitespace-nowrap tracking-tighter">
          BORAGERIR
        </span>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="md:col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_BASE64} alt="BoraGerir" style={{ height: '36px' }} className="mb-4 brightness-0 invert" />
              <p className="text-sm text-gray-400 mb-4">
                Powered by WhatsApp Business API
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Aumente seus resultados e eleve o atendimento do seu negócio a outro nível.
              </p>
              <div className="flex gap-3">
                <a href="#" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-200">Funcionalidades</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Contatos</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Campanhas</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">CRM</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Templates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-200">Planos</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Starter</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Premium</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Business</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4 text-gray-200">Empresa</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Sobre nós</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Suporte</Link></li>
                <li><Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Contato</Link></li>
              </ul>

              <Link
                href="/register"
                className="inline-block mt-6 bg-[#F26522] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#d4561c] transition-colors"
              >
                Ver Planos
              </Link>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/10 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} BoraGerir Conversas. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
