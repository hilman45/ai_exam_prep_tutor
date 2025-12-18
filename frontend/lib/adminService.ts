// Admin service for API calls
import { supabase, authHelpers } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface DashboardStats {
  total_users: number
  total_quizzes_taken: number
  total_flashcards_reviewed: number
  total_notes_generated: number
  total_ai_chat_interactions: number
  daily_active_users: number
}

export interface User {
  user_id: string
  username: string
  email: string
  full_name: string | null
  is_admin: boolean
  is_active: boolean
  created_at: string
}

export interface TopicPerformance {
  topic_name: string
  average_score: number
  total_attempts: number
}

export interface TopicAttempts {
  topic_name: string
  attempt_count: number
}

export interface FlashcardDifficulty {
  again_count: number
  good_count: number
  easy_count: number
}

export interface DailyActivity {
  date: string
  quiz_count: number
  flashcard_count: number
  total_actions: number
}

export const adminService = {
  /**
   * Check if the current user is an admin
   */
  async checkIsAdmin(): Promise<boolean> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        return false
      }

      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .single()

      if (profileError || !data) {
        return false
      }

      return data.is_admin === true
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  },

  /**
   * Get dashboard statistics (admin only)
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      // Get access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  },

  /**
   * Get list of all users (admin only)
   */
  async getUsers(search?: string): Promise<User[]> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const url = new URL(`${API_BASE_URL}/admin/users`)
      if (search) {
        url.searchParams.append('search', search)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch users: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  },

  /**
   * Get user details by ID (admin only)
   */
  async getUserDetails(userId: string): Promise<User> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        if (response.status === 404) {
          throw new Error('User not found')
        }
        throw new Error(`Failed to fetch user details: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching user details:', error)
      throw error
    }
  },

  /**
   * Deactivate a user account (admin only)
   */
  async deactivateUser(userId: string): Promise<void> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        if (response.status === 400) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Cannot deactivate this user')
        }
        throw new Error(`Failed to deactivate user: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      throw error
    }
  },

  /**
   * Activate a user account (admin only)
   */
  async activateUser(userId: string): Promise<void> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/activate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to activate user: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error activating user:', error)
      throw error
    }
  },

  /**
   * Get quiz performance by topic (admin only)
   * @param userId Optional user ID to filter by specific user
   */
  async getQuizPerformanceByTopic(userId?: string): Promise<TopicPerformance[]> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const url = new URL(`${API_BASE_URL}/admin/analytics/quiz-performance-by-topic`)
      if (userId) {
        url.searchParams.append('user_id', userId)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch quiz performance: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching quiz performance by topic:', error)
      throw error
    }
  },

  /**
   * Get most attempted quiz topics (admin only)
   * @param userId Optional user ID to filter by specific user
   */
  async getMostAttemptedTopics(userId?: string): Promise<TopicAttempts[]> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const url = new URL(`${API_BASE_URL}/admin/analytics/most-attempted-topics`)
      if (userId) {
        url.searchParams.append('user_id', userId)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch most attempted topics: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching most attempted topics:', error)
      throw error
    }
  },

  /**
   * Get flashcard review difficulty distribution (admin only)
   * @param userId Optional user ID to filter by specific user
   */
  async getFlashcardDifficulty(userId?: string): Promise<FlashcardDifficulty> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const url = new URL(`${API_BASE_URL}/admin/analytics/flashcard-difficulty`)
      if (userId) {
        url.searchParams.append('user_id', userId)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch flashcard difficulty: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching flashcard difficulty:', error)
      throw error
    }
  },

  /**
   * Get daily study activity (admin only)
   * @param days Number of days to retrieve (default: 30)
   * @param userId Optional user ID to filter by specific user
   */
  async getDailyStudyActivity(days: number = 30, userId?: string): Promise<DailyActivity[]> {
    try {
      const { user, error } = await authHelpers.getCurrentUser()
      if (error || !user) {
        throw new Error('User not authenticated')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No access token available')
      }

      const url = new URL(`${API_BASE_URL}/admin/analytics/daily-study-activity`)
      url.searchParams.append('days', days.toString())
      if (userId) {
        url.searchParams.append('user_id', userId)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Admin access required')
        }
        throw new Error(`Failed to fetch daily study activity: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching daily study activity:', error)
      throw error
    }
  }
}

