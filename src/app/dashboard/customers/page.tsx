import { createClient } from '@/lib/supabase/server'
import { getBusinessId } from '@/lib/getBusinessId'
import CustomersClient from './CustomersClient'

export default async function CustomersPage() {
  const supabase = createClient()
  const businessId = await getBusinessId(supabase)
  const [{ data: customers }, { data: appointments }] = await Promise.all([
    supabase.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase.from('appointments').select('customer_name, price, status').eq('business_id', businessId),
  ])

  // Compute per-customer stats
  const statsMap: Record<string, { visits: number; totalSpent: number }> = {}
  for (const a of appointments ?? []) {
    if (!statsMap[a.customer_name]) statsMap[a.customer_name] = { visits: 0, totalSpent: 0 }
    statsMap[a.customer_name].visits++
    if (a.status !== 'בוטל') statsMap[a.customer_name].totalSpent += a.price || 0
  }

  return <CustomersClient initialCustomers={customers ?? []} statsMap={statsMap} businessId={businessId} />
}
