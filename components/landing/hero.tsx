'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MessageCircle, Instagram } from 'lucide-react'
import { HERO_LOGO_BASE64 } from '@/lib/hero-logo-base64'


export function Hero() {
  return (
    <section className="pt-48 pb-20 lg:pt-56 lg:pb-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container mx-auto px-4 text-center max-w-4xl">
        {/* Logo + Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_LOGO_BASE64} alt="BoraGerir" style={{ height: '120px' }} className="mb-4" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">Powered by WhatsApp Business API</span>
          </div>
        </motion.div>

        {/* Decorative icons */}
        <div className="absolute left-8 top-1/2 -translate-y-1/2 hidden lg:block">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MessageCircle className="h-12 w-12 text-gray-200" />
          </motion.div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Instagram className="h-12 w-12 text-gray-200" />
          </motion.div>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
        >
          Automatize o atendimento{' '}
          <br className="hidden md:block" />
          no WhatsApp com IA
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-500 mb-2"
        >
          Gerencie leads no CRM
          <br />
          e dispare campanhas em massa
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-sm text-gray-400 mb-10"
        >
          Com a segurança da API Oficial da Meta.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center gap-4"
        >
          <Link
            href="/register"
            className="bg-[#F26522] text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-[#d4561c] transition-all shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 hover:-translate-y-0.5"
          >
            Testar por 14 dias grátis
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
