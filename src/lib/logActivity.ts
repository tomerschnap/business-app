import { createClient } from '@/lib/supabase/client'

export async function logActivity(action: string, details = '') {
  try {
    const supabase = createClient()
    await supabase.from('activity_log').insert({ action, details })
  } catch {
    // Silent fail — log should never break the app
  }
}
