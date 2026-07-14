import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const mediaId = request.nextUrl.searchParams.get('mediaId')
    const mediaUrl = request.nextUrl.searchParams.get('mediaUrl')

    if (!mediaId && !mediaUrl) {
      return NextResponse.json({ error: 'mediaId ou mediaUrl obrigatório' }, { status: 400 })
    }

    // Buscar token da empresa do usuário
    const serviceClient = createServiceRoleClient()
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    const { data: company } = await serviceClient
      .from('companies')
      .select('whatsapp_token')
      .eq('id', member.company_id)
      .single()

    const token = company?.whatsapp_token || process.env.WHATSAPP_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'Token não configurado' }, { status: 400 })
    }

    let resolvedMediaId: string | null = mediaId || null
    let downloadUrl: string | null = null

    // Detectar se mediaUrl contém um meta_media:ID (novo formato)
    if (mediaUrl?.startsWith('meta_media:')) {
      resolvedMediaId = mediaUrl.replace('meta_media:', '')
    }

    // Se temos um media ID, resolver via Graph API para obter URL de download
    if (resolvedMediaId) {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${resolvedMediaId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        downloadUrl = metaData.url
      } else {
        // Tentar com token do env como fallback
        const envToken = process.env.WHATSAPP_ACCESS_TOKEN
        if (envToken && envToken !== token) {
          const retryRes = await fetch(`https://graph.facebook.com/v19.0/${resolvedMediaId}`, {
            headers: { 'Authorization': `Bearer ${envToken}` },
          })
          if (retryRes.ok) {
            const retryData = await retryRes.json()
            downloadUrl = retryData.url
          }
        }
      }
    }

    // Se temos uma URL direta (formato antigo - URL temporária da Meta)
    if (!downloadUrl && mediaUrl && !mediaUrl.startsWith('meta_media:')) {
      if (mediaUrl.startsWith('http')) {
        downloadUrl = mediaUrl
      }
    }

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Mídia não encontrada ou expirada' }, { status: 404 })
    }

    // Baixar mídia usando o token
    const mediaResponse = await fetch(downloadUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!mediaResponse.ok) {
      // Tentar com token do env como fallback
      const envToken = process.env.WHATSAPP_ACCESS_TOKEN
      if (envToken && envToken !== token) {
        const retryResponse = await fetch(downloadUrl, {
          headers: { 'Authorization': `Bearer ${envToken}` },
        })
        if (retryResponse.ok) {
          const contentType = retryResponse.headers.get('content-type') || 'application/octet-stream'
          const buffer = await retryResponse.arrayBuffer()
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=3600',
            },
          })
        }
      }

      // Se é URL antiga que expirou, não há como recuperar sem o media_id
      return NextResponse.json(
        { error: 'Mídia expirada ou indisponível. Mídias recebidas antes desta atualização podem não estar mais acessíveis.' },
        { status: 410 }
      )
    }

    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
    const buffer = await mediaResponse.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Media proxy error:', error)
    return NextResponse.json({ error: 'Erro ao buscar mídia' }, { status: 500 })
  }
}
