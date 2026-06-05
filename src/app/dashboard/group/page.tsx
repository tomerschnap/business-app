import { createClient } from '@/lib/supabase/server'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: sessions }, { data: profile }] = await Promise.all([
    supabase.from('group_sessions').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('business_profiles').select('working_hours').eq('user_id', user?.id ?? '').single(),
  ])

  return (
    <GroupClient
      initialSessions={sessions ?? []}
      workingHours={profile?.working_hours ?? null}
    />
  )
}
