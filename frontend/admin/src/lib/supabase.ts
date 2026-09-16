import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zefsyngtxzqhjnylzlcg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnN5bmd0eHpxaGpueWx6bGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDYxMzcsImV4cCI6MjA5MzQ4MjEzN30.yv8XT1oUQCRTUOBHI2fhxon_pyJ8eGrPnpdEIukirr4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})
