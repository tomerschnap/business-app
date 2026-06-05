import { createClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = createClient()
  const [{ data: orders }, { data: customers }, { data: services }] = await Promise.all([
    supabase.from('orders').select('*').order('date', { ascending: true }),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('services').select('*').order('name'),
  ])

  return (
    <OrdersClient
      initialOrders={orders ?? []}
      customers={customers ?? []}
      services={services ?? []}
    />
  )
}
