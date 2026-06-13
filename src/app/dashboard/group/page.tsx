import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const businessId = await getBusinessId(supabase)

  const [{ data: sessions }, { data: profile }] = await Promise.all([
    supabase.from('group_sessions').select('*').eq('business_id', businessId).order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('business_profiles').select('working_hours').eq('user_id', user?.id ?? '').single(),
  ])

  return (
    <GroupClient
      initialSessions={sessions ?? []}
      workingHours={profile?.working_hours ?? null}
      businessId={businessId}
    />
  )
}
