'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'

export function CTADark() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-20" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto bg-gray-900 rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 -z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#F26522]/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Comece agora mesmo!
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Centralize seus atendimentos em um único WhatsApp
            </p>
            <Link
              href="/register"
              className="inline-block bg-white text-gray-900 px-8 py-4 rounded-xl text-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Começar
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
