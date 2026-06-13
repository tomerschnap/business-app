import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import ActivityClient from './ActivityClient'

export default async function ActivityPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const { data: logs } = await supabase
    .from('activity_log')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(300)

  return <ActivityClient logs={logs ?? []} />
}
