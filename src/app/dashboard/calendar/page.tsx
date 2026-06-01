import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'

export default async function CalendarPage() {
  const supabase = createClient()
  const [{ data: appointments }, { data: orders }, { data: customers }] = await Promise.all([
    supabase.from('appointments').select('*').order('date').order('time'),
    supabase.from('orders').select('*').order('date'),
    supabase.from('customers').select('id, name').order('name'),
  ])
  return (
    <CalendarClient
      initialAppointments={appointments ?? []}
      initialOrders={orders ?? []}
      customers={customers ?? []}
    />
  )
}
