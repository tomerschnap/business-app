import { createClient } from '@/lib/supabase/server'
import ServicesClient from './ServicesClient'

export default async function ServicesPage() {
  const supabase = createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: false })

  return <ServicesClient initialServices={services ?? []} />
}
