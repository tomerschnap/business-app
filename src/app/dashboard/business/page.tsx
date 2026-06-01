import { createClient } from '@/lib/supabase/server'
import BusinessClient from './BusinessClient'

export default async function BusinessPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user?.id)
    .single()

  return <BusinessClient initialProfile={profile} userId={user?.id ?? ''} />
}
