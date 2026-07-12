'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, MessageSquare } from 'lucide-react'


export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMobileOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 w-[95%] max-w-5xl ${
      scrolled ? 'bg-white/95 shadow-lg' : 'bg-white/80'
    } backdrop-blur-md rounded-2xl border border-gray-100`}>
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#F26522] rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">
            Bora<span className="text-[#F26522]">Gerir</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => scrollTo('funcionalidades')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Funcionalidades
          </button>
          <button onClick={() => scrollTo('planos')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Planos
          </button>
          <button onClick={() => scrollTo('sobre')} className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Empresa
          </button>
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Login
          </Link>
          <Link
            href="/register"
            className="bg-[#F26522] text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-[#d4561c] transition-colors shadow-sm"
          >
            Entrar
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-4 border-t border-gray-100 mt-2 pt-4 space-y-3">
          <button onClick={() => scrollTo('funcionalidades')} className="block text-sm text-gray-600 hover:text-gray-900 w-full text-left">
            Funcionalidades
          </button>
          <button onClick={() => scrollTo('planos')} className="block text-sm text-gray-600 hover:text-gray-900 w-full text-left">
            Planos
          </button>
          <button onClick={() => scrollTo('sobre')} className="block text-sm text-gray-600 hover:text-gray-900 w-full text-left">
            Empresa
          </button>
          <div className="pt-3 border-t border-gray-100 flex gap-3">
            <Link href="/login" className="text-sm text-gray-600">Login</Link>
            <Link href="/register" className="bg-[#F26522] text-white px-4 py-2 rounded-xl text-sm font-medium">
              Entrar
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
