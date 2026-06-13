import { createClient } from '@/lib/supabase/client'
import { getBusinessId } from '@/lib/getBusinessId'

export async function logActivity(action: string, details = '') {
  try {
    const supabase = createClient()
    const businessId = await getBusinessId(supabase)
    await supabase.from('activity_log').insert({ action, details, business_id: businessId })
  } catch {
    // Silent fail — log should never break the app
  }
}
