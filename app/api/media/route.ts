import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getMediaUrl, downloadMedia } from '@/lib/meta'

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

    let url = mediaUrl
    if (mediaId && !url) {
      url = await getMediaUrl(mediaId)
    }

    if (!url) {
      return NextResponse.json({ error: 'URL não encontrada' }, { status: 404 })
    }

    // Baixar mídia da Meta e retornar como proxy
    const mediaResponse = await downloadMedia(url)
    const contentType = mediaResponse.headers.get('content-type') || 'application/octet-stream'
    const buffer = await mediaResponse.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Media error:', error)
    return NextResponse.json({ error: 'Erro ao buscar mídia' }, { status: 500 })
  }
}
