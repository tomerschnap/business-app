import { createClient } from '@/lib/supabase/server'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const supabase = createClient()
  const [{ data: sessions }, { data: customers }] = await Promise.all([
    supabase.from('group_sessions').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('customers').select('id, name').order('name'),
  ])

  return (
    <GroupClient
      initialSessions={sessions ?? []}
      customers={customers ?? []}
    />
  )
}
