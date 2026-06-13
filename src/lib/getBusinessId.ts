import type { SupabaseClient } from '@supabase/supabase-js'

export async function getBusinessId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return data?.id ?? null
}
