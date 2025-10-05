// Test Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mralldnfrckrnjifojzj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yYWxsZG5mcmNrcm5qaWZvanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MjE4NDgsImV4cCI6MjA3Mzk5Nzg0OH0.0etrhMvMvSnKDIzVM3w5ajdzeZ7WneUN081GnJKJxyk'

const supabase = createClient(supabaseUrl, supabaseKey)

// Test connection
async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession()
    console.log('Supabase connection test:', { data, error })
    return { success: true, data, error }
  } catch (err) {
    console.error('Supabase connection failed:', err)
    return { success: false, error: err }
  }
}

// Run test
testConnection()

