import { createClient } from '@/lib/supabase/server'
import AppointmentsClient from './AppointmentsClient'

export default async function AppointmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: appointments }, { data: customers }, { data: profile }, { data: services }, { data: blockedDates }] = await Promise.all([
    supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('business_profiles').select('working_hours').eq('user_id', user?.id ?? '').single(),
    supabase.from('services').select('*').order('name'),
    supabase.from('blocked_dates').select('date, reason').order('date'),
  ])

  return (
    <AppointmentsClient
      initialAppointments={appointments ?? []}
      customers={customers ?? []}
      workingHours={profile?.working_hours ?? null}
      services={services ?? []}
      blockedDates={(blockedDates ?? []).map(b => b.date)}
    />
  )
}
