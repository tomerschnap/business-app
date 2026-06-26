import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import AppointmentsClient from './AppointmentsClient'

export default async function AppointmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const businessId = await getBusinessId(supabase)

  const [{ data: appointments }, { data: customers }, { data: profile }, { data: services }, { data: blockedDates }] = await Promise.all([
    supabase.from('appointments').select('*').eq('business_id', businessId).order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('customers').select('id, name, phone').eq('business_id', businessId).order('name'),
    supabase.from('business_profiles').select('working_hours').eq('user_id', user?.id ?? '').single(),
    supabase.from('services').select('*').eq('business_id', businessId).order('name'),
    supabase.from('blocked_dates').select('date, reason').eq('business_id', businessId).order('date'),
  ])

  return (
    <AppointmentsClient
      initialAppointments={appointments ?? []}
      customers={customers ?? []}
      workingHours={profile?.working_hours ?? null}
      services={services ?? []}
      blockedDates={(blockedDates ?? []).map(b => b.date)}
      businessId={businessId}
    />
  )
}
