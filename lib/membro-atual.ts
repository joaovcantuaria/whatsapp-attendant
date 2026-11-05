import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'

/** Membro logado: empresa ativa e se pode administrar (dono ou admin). */
export async function membroAtual(): Promise<{ userId: string; companyId: string; admin: boolean } | null> {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data } = await createServiceRoleClient()
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .single()
  return data
    ? { userId: session.user.id, companyId: data.company_id as string, admin: data.role === 'owner' || data.role === 'admin' }
    : null
}
