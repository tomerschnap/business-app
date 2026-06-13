import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const [{ data: appointments }, { data: orders }, { data: customers }] = await Promise.all([
    supabase.from('appointments').select('*').eq('business_id', businessId).order('date').order('time'),
    supabase.from('orders').select('*').eq('business_id', businessId).order('date'),
    supabase.from('customers').select('id, name').eq('business_id', businessId).order('name'),
  ])
  return (
    <CalendarClient
      initialAppointments={appointments ?? []}
      initialOrders={orders ?? []}
      customers={customers ?? []}
    />
  )
}
