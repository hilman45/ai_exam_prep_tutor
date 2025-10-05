import { createClient } from '@supabase/supabase-js'

// Supabase configuration - require environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Debug: Log the environment variables (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('✅ Supabase URL:', supabaseUrl)
  console.log('✅ Supabase Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')
  console.log('✅ Using environment variables: true')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const authHelpers = {
  // Sign up with email and password
  async signUp(email: string, password: string, username: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) {
        throw error
      }

      // If user is created successfully, also create user profile
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: data.user.id,
              username: username
            })

          if (profileError) {
            console.warn('Failed to create user profile:', profileError)
            // Don't throw error here as user is still created
          }
        } catch (profileError) {
          console.warn('Error creating user profile:', profileError)
          // Continue anyway
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { data: null, error }
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      return { error: null }
    } catch (error) {
      return { error }
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      return { user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  },

  // Get user profile
  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('user_id', userId)
        .single()

      if (error) {
        throw error
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Store tokens in localStorage
  storeTokens(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase_access_token', accessToken)
      localStorage.setItem('supabase_refresh_token', refreshToken)
    }
  },

  // Get tokens from localStorage
  getTokens() {
    if (typeof window !== 'undefined') {
      return {
        accessToken: localStorage.getItem('supabase_access_token'),
        refreshToken: localStorage.getItem('supabase_refresh_token')
      }
    }
    return { accessToken: null, refreshToken: null }
  },

  // Clear tokens from localStorage
  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_access_token')
      localStorage.removeItem('supabase_refresh_token')
    }
  }
}

// Auth state listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}
