import { createClient } from '@/lib/supabase/server'
import AppointmentsClient from './AppointmentsClient'

export default async function AppointmentsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: appointments }, { data: customers }, { data: profile }] = await Promise.all([
    supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true }),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('business_profiles').select('working_hours').eq('user_id', user?.id ?? '').single(),
  ])

  return (
    <AppointmentsClient
      initialAppointments={appointments ?? []}
      customers={customers ?? []}
      workingHours={profile?.working_hours ?? null}
    />
  )
}
