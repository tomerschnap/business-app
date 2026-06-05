import { createClient } from '@/lib/supabase/server'
import ActivityClient from './ActivityClient'

export default async function ActivityPage() {
  const supabase = createClient()
  const { data: logs } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  return <ActivityClient logs={logs ?? []} />
}
