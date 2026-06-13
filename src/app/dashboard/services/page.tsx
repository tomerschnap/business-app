import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import ServicesClient from './ServicesClient'

export default async function ServicesPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  return <ServicesClient initialServices={services ?? []} businessId={businessId} />
}
