// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yuwqrvnygpnmkxvucoig.supabase.co' // Replace with your URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1d3Fydm55Z3BubWt4dnVjb2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MDk2MjEsImV4cCI6MjA3MTI4NTYyMX0.Xtj9R6gqOvwcQ1HLuR-URoVEe3wqtaD0Pu-VR0V_ikQ' // Replace with your anon key

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
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1d3Fydm55Z3BubWt4dnVjb2lnIiwicm9zZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcwOTYyMSwiZXhwIjoyMDcxMjg1NjIxfQ.VGgax4fHFsgI_5Y7rzWXI-dLSDXz_qXkwqSuC1XIY-M', // Replace with service role key
  {
    auth: {
      persistSession: false,
    },
  }
)