import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const [{ data: appointments }, { data: groupSessions }] = await Promise.all([
    supabase.from('appointments').select('date, price, status, customer_name').order('date', { ascending: false }),
    supabase.from('group_sessions').select('date, price_per_participant, enrolled').order('date', { ascending: false }),
  ])

  return (
    <ReportsClient
      appointments={appointments ?? []}
      groupSessions={groupSessions ?? []}
    />
  )
}
