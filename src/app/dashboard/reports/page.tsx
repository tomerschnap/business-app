import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const [{ data: appointments }, { data: groupSessions }] = await Promise.all([
    supabase.from('appointments').select('date, price, status, customer_name').eq('business_id', businessId).order('date', { ascending: false }),
    supabase.from('group_sessions').select('date, price_per_participant, enrolled').eq('business_id', businessId).order('date', { ascending: false }),
  ])

  return (
    <ReportsClient
      appointments={appointments ?? []}
      groupSessions={groupSessions ?? []}
    />
  )
}
