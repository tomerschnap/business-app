import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const [
    { count: customerCount },
    { count: todayApptCount },
    { data: todayAppts },
    { data: todayOrders },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('date', today),
    supabase.from('appointments').select('*').eq('business_id', businessId).eq('date', today).order('time'),
    supabase.from('orders').select('*').eq('business_id', businessId).eq('date', today).order('created_at'),
  ])

  const todayRevenue = (todayAppts ?? [])
    .filter(a => a.status !== 'בוטל')
    .reduce((s, a) => s + (Number(a.price) || 0), 0)

  return (
    <DashboardClient
      customerCount={customerCount ?? 0}
      todayApptCount={todayApptCount ?? 0}
      todayRevenue={todayRevenue}
      todayAppts={todayAppts ?? []}
      todayOrders={todayOrders ?? []}
      dateLabel={now.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      todayLabel={now.toLocaleDateString('he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
    />
  )
}
