import { NextRequest, NextResponse } from 'next/server'
import { connectBaileys, getInstanceStatus, disconnectBaileys } from '@/lib/baileys-manager'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Get company_id from agent
    const { data: agent } = await supabase
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const instance = getInstanceStatus(agent.company_id)
    
    let qrDataUrl: string | null = null
    if (instance.qr) {
      qrDataUrl = await QRCode.toDataURL(instance.qr, {
        width: 300,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    }

    return NextResponse.json({
      status: instance.status,
      qr: qrDataUrl,
      phone: instance.phone,
      name: instance.name,
      lastUpdated: instance.lastUpdated,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { data: agent } = await supabase
      .from('agents')
      .select('company_id')
      .eq('id', session.user.id)
      .single()

    if (!agent?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'connect') {
      const result = await connectBaileys(agent.company_id)
      
      let qrDataUrl: string | null = null
      if (result.qr) {
        qrDataUrl = await QRCode.toDataURL(result.qr, {
          width: 300,
          margin: 2,
          color: { dark: '#1a1a1a', light: '#ffffff' },
        })
      }

      return NextResponse.json({ status: result.status, qr: qrDataUrl })
    }

    if (action === 'disconnect') {
      await disconnectBaileys(agent.company_id)
      return NextResponse.json({ status: 'disconnected' })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('WhatsApp QR error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
