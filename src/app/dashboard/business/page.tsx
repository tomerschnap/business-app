import { createClient } from '@/lib/supabase/server'
import BusinessClient from './BusinessClient'

export default async function BusinessPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: blockedDates }] = await Promise.all([
    supabase.from('business_profiles').select('*').eq('user_id', user?.id).single(),
    supabase.from('blocked_dates').select('*').order('date'),
  ])

  return <BusinessClient initialProfile={profile} userId={user?.id ?? ''} initialBlockedDates={blockedDates ?? []} />
}
