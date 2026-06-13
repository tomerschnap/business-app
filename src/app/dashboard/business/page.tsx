import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import BusinessClient from './BusinessClient'

export default async function BusinessPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const businessId = await getBusinessId(supabase)

  const [{ data: profile }, { data: blockedDates }] = await Promise.all([
    supabase.from('business_profiles').select('*').eq('user_id', user?.id).single(),
    supabase.from('blocked_dates').select('*').eq('business_id', businessId).order('date'),
  ])

  return <BusinessClient initialProfile={profile} userId={user?.id ?? ''} initialBlockedDates={blockedDates ?? []} businessId={businessId} />
}
