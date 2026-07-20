import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// GET - Buscar avaliações da empresa
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()

    // Buscar company_id do membro
    const { data: member } = await serviceClient
      .from('company_members')
      .select('company_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 400 })
    }

    // Buscar filtros da query string
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Buscar avaliações
    const { data: ratings, count } = await serviceClient
      .from('satisfaction_ratings')
      .select('*', { count: 'exact' })
      .eq('company_id', member.company_id)
      .gte('rated_at', startDate.toISOString())
      .order('rated_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Calcular métricas
    const { data: allRatings } = await serviceClient
      .from('satisfaction_ratings')
      .select('rating')
      .eq('company_id', member.company_id)
      .gte('rated_at', startDate.toISOString())

    const total = allRatings?.length || 0
    const sum = allRatings?.reduce((acc, r) => acc + r.rating, 0) || 0
    const average = total > 0 ? (sum / total).toFixed(1) : '0'

    // Distribuição por nota
    const distribution = [1, 2, 3, 4, 5].map(note => ({
      rating: note,
      count: allRatings?.filter(r => r.rating === note).length || 0,
      percentage: total > 0 ? Math.round(((allRatings?.filter(r => r.rating === note).length || 0) / total) * 100) : 0,
    }))

    // NPS simplificado (promotores 4-5 vs detratores 1-3)
    const promoters = allRatings?.filter(r => r.rating >= 4).length || 0
    const detractors = allRatings?.filter(r => r.rating <= 2).length || 0
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0

    return NextResponse.json({
      ratings: ratings || [],
      total: count || 0,
      metrics: {
        total,
        average: parseFloat(average),
        nps,
        promoters,
        detractors,
        neutral: total - promoters - detractors,
        distribution,
      },
    })
  } catch (error) {
    console.error('Satisfaction GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Registrar avaliação (chamado pelo servidor WhatsApp ou manualmente)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const serviceClient = createServiceRoleClient()
    const body = await request.json()

    const { company_id, contact_id, conversation_id, message_id, contact_name, contact_phone, rating, feedback } = body

    if (!company_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'company_id e rating (1-5) obrigatórios' }, { status: 400 })
    }

    const { data, error } = await serviceClient
      .from('satisfaction_ratings')
      .insert({
        company_id,
        contact_id: contact_id || null,
        conversation_id: conversation_id || null,
        message_id: message_id || null,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        rating,
        feedback: feedback || null,
        rated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Satisfaction POST error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
