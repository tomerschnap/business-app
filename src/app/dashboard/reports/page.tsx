import { createClient } from '@/lib/supabase/server'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = createClient()
  const { data: appointments } = await supabase
    .from('appointments')
    .select('date, price, status, customer_name')
    .order('date', { ascending: false })

  return <ReportsClient appointments={appointments ?? []} />
}
