// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

export const supabaseUrl = 'https://smquapwwbriovatjwmfi.supabase.co'
export const supabaseAnonKey = 'sb_publishable_-7ApRSgcYxT3L2hYnQlowA_zJap-yKf'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// For server-side operations (keep this secure)
export const supabaseAdmin = createClient(
  supabaseUrl,
  'sb_secret_NVFdEIv6_tt1bb8hGbnuPw_G29iFV85',
  {
    auth: {
      persistSession: false,
    },
  }
)