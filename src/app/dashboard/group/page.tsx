import { createClient } from '@/lib/supabase/server'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const supabase = createClient()
  const { data: sessions } = await supabase
    .from('group_sessions')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  return <GroupClient initialSessions={sessions ?? []} />
}
