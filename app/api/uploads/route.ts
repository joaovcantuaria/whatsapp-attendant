import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'uploads'

// GET - Listar uploads da empresa
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

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

    // Listar arquivos no bucket da empresa
    const folder = member.company_id
    const { data: files, error } = await serviceClient.storage
      .from(BUCKET_NAME)
      .list(folder, { sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Gerar URLs públicas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const uploads = (files || [])
      .filter(f => f.name !== '.emptyFolderPlaceholder')
      .map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        type: f.metadata?.mimetype || 'unknown',
        created_at: f.created_at,
        url: `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${folder}/${f.name}`,
      }))

    return NextResponse.json(uploads)
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Upload de arquivo
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    }

    // Validar tipo (imagens, videos, documentos)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Tipo não permitido. Use: JPG, PNG, WebP, GIF, MP4 ou PDF',
      }, { status: 400 })
    }

    // Validar tamanho (max 5MB para imagens, 16MB para outros)
    const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 16 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `Arquivo muito grande. Máximo: ${file.type.startsWith('image/') ? '5MB' : '16MB'}`,
      }, { status: 400 })
    }

    // Gerar nome único
    const ext = file.name.split('.').pop() || 'bin'
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50)
    const uniqueName = `${Date.now()}_${safeName}`
    const path = `${member.company_id}/${uniqueName}`

    // Upload
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Se o bucket não existe, criar
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        await serviceClient.storage.createBucket(BUCKET_NAME, { public: true })
        // Tentar de novo
        const { error: retryError } = await serviceClient.storage
          .from(BUCKET_NAME)
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          })
        if (retryError) {
          return NextResponse.json({ error: retryError.message }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }
    }

    // Gerar URL pública
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`

    return NextResponse.json({
      success: true,
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover arquivo
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

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

    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json({ error: 'filename obrigatório' }, { status: 400 })
    }

    const path = `${member.company_id}/${filename}`
    const { error } = await serviceClient.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
