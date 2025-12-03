import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  // We throw only if we're trying to use the admin client, to avoid crashing client-side if envs are partial
  if (typeof window === 'undefined') {
     console.warn('Missing Supabase Service Role Key - Admin operations will fail')
  }
}

// Admin client with full privileges (Service Role) - Server-side only
export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey || '')

