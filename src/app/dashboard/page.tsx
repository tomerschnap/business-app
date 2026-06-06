import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()

  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const [
    { count: customerCount },
    { count: todayApptCount },
    { data: todayAppts },
    { data: todayOrders },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('date', today),
    supabase.from('appointments').select('*').eq('date', today).order('time'),
    supabase.from('orders').select('*').eq('date', today).order('created_at'),
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
