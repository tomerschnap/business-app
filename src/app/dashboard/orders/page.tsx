import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import OrdersClient from './OrdersClient'

export default async function OrdersPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const [{ data: orders }, { data: customers }, { data: services }] = await Promise.all([
    supabase.from('orders').select('*').eq('business_id', businessId).order('date', { ascending: true }),
    supabase.from('customers').select('id, name').eq('business_id', businessId).order('name'),
    supabase.from('services').select('*').eq('business_id', businessId).order('name'),
  ])

  return (
    <OrdersClient
      initialOrders={orders ?? []}
      customers={customers ?? []}
      services={services ?? []}
      businessId={businessId}
    />
  )
}
