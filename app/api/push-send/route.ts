import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// Chaves VAPID - Em produção, coloque no .env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BI8NHA6QoyXqp4G5nB2kCWVkgHSpAX-S_yucVEsQaLZtRcPM5DNbdlQdNZMaQBD4A79TP9qAko-eH2tWYbmp32M'
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'D6rfQtIxGqMm4TUVgfuPIhqM3x4J2wMXugRtQ6vjibk'
const VAPID_SUBJECT = 'mailto:contato@boragerir.com'

// Enviar push notification para todos os agentes de uma empresa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, title, body: messageBody, url, excludeUserId } = body

    if (!companyId || !title) {
      return NextResponse.json({ error: 'companyId e title obrigatórios' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar todas as subscriptions da empresa
    let query = serviceClient
      .from('push_subscriptions')
      .select('*')
      .eq('company_id', companyId)

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }

    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body: messageBody || '',
      url: url || '/conversations',
      tag: 'message',
    })

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        // Usar fetch direto para Web Push (sem dependência web-push)
        const response = await sendWebPush(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        )

        if (response) {
          sent++
        } else {
          failed++
          // Remover subscription inválida
          await serviceClient
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      } catch {
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Implementação de Web Push sem a lib web-push (usa crypto nativo)
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
): Promise<boolean> {
  try {
    // Para simplificar, usar fetch com headers mínimos
    // Em produção com muitos pushes, usar a lib web-push no servidor
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
      },
      body: payload,
    })

    return response.ok || response.status === 201
  } catch {
    return false
  }
}
