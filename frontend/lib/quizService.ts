// Quiz service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface QuizQuestion {
  question: string
  options: string[]
  answer_index: number
}

export interface Quiz {
  id: string
  file_id: string
  user_id: string
  questions: QuizQuestion[]
  folder_id: string
  created_at: string
  filename?: string
  custom_name?: string
  display_name?: string
}

export interface GenerateQuizResponse {
  quiz_id: string
  questions: QuizQuestion[]
  cached: boolean
  filename?: string
  question_count: number
  created_at?: string
}

export interface QuizInteraction {
  question_id: number
  is_correct: boolean
  time_taken: number
}

export interface QuizAnalytics {
  total_attempted: number
  total_correct: number
  accuracy_percentage: number
  average_time_per_question: number
}

export interface QuizDailyAnalytics {
  total_attempted: number
  total_correct: number
  accuracy_percentage: number
  average_time_per_question: number
  total_quizzes_completed: number
  total_study_time: number
}

export interface QuizWithAnalytics {
  id: string
  display_name: string
  filename?: string
  custom_name?: string
  accuracy_percentage: number
  total_attempted: number
  total_correct: number
}

class QuizService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async generateQuiz(fileId: string, questionCount: number, customName?: string): Promise<GenerateQuizResponse> {
    try {
      const headers = await this.getAuthHeaders()
      
      // Generate quiz with question count and custom name parameters
      const queryParams = new URLSearchParams({
        question_count: questionCount.toString()
      })
      if (customName) {
        queryParams.append('custom_name', customName)
      }
      
      const response = await fetch(`${API_BASE_URL}/ai/quiz/${fileId}?${queryParams.toString()}`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to generate quiz: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error generating quiz:', error)
      throw error
    }
  }

  // Note: These methods are not implemented in the backend yet
  // For now, we'll use sessionStorage for quiz management
  // TODO: Implement these endpoints in the backend when needed
  
  async getQuiz(quizId: string): Promise<Quiz> {
    throw new Error('getQuiz endpoint not implemented in backend yet')
  }

  async getQuizzesByFolder(folderId: string): Promise<Quiz[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/quiz/folder/${folderId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch quizzes: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching quizzes:', error)
      throw error
    }
  }

  async updateQuiz(quizId: string, questions: QuizQuestion[]): Promise<Quiz> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/quiz/${quizId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ questions }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update quiz: ${response.statusText}`)
      }

      const result = await response.json()
      return result.quiz
    } catch (error) {
      console.error('Error updating quiz:', error)
      throw error
    }
  }

  async deleteQuiz(quizId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/delete/quiz/${quizId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to delete quiz: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting quiz:', error)
      throw error
    }
  }

  async recordInteraction(quizId: string, interaction: QuizInteraction): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/quiz/${quizId}/interaction`, {
        method: 'POST',
        headers,
        body: JSON.stringify(interaction),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to record interaction: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error recording interaction:', error)
      // Don't throw - we don't want to interrupt the quiz flow if analytics fail
    }
  }

  async getAnalytics(quizId: string): Promise<QuizAnalytics> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/quiz/${quizId}/analytics`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to fetch analytics: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching analytics:', error)
      throw error
    }
  }

  async getDailyAnalytics(): Promise<QuizDailyAnalytics> {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Get today's date range (start and end of today)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Query quiz_interactions for today (RLS will automatically filter by user_id)
      const { data: interactions, error } = await supabase
        .from('quiz_interactions')
        .select('is_correct, time_taken, quiz_id, answered_at')
        .gte('answered_at', today.toISOString())
        .lt('answered_at', tomorrow.toISOString())
        .order('answered_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch daily analytics: ${error.message}`)
      }

      if (!interactions || interactions.length === 0) {
        return {
          total_attempted: 0,
          total_correct: 0,
          accuracy_percentage: 0,
          average_time_per_question: 0,
          total_quizzes_completed: 0,
          total_study_time: 0,
        }
      }

      // Calculate analytics
      const total_attempted = interactions.length
      const total_correct = interactions.filter(i => i.is_correct).length
      const accuracy_percentage = total_attempted > 0 ? (total_correct / total_attempted) * 100 : 0
      
      const times = interactions.map(i => parseFloat(i.time_taken?.toString() || '0'))
      const average_time_per_question = times.length > 0 
        ? times.reduce((sum, time) => sum + time, 0) / times.length 
        : 0

      // Count unique quizzes completed (quizzes with at least one interaction)
      const uniqueQuizIds = new Set(interactions.map(i => i.quiz_id))
      const total_quizzes_completed = uniqueQuizIds.size

      // Total study time (sum of all time_taken)
      const total_study_time = times.reduce((sum, time) => sum + time, 0)

      return {
        total_attempted,
        total_correct,
        accuracy_percentage: Math.round(accuracy_percentage * 100) / 100,
        average_time_per_question: Math.round(average_time_per_question * 100) / 100,
        total_quizzes_completed,
        total_study_time: Math.round(total_study_time * 100) / 100,
      }
    } catch (error) {
      console.error('Error fetching daily quiz analytics:', error)
      throw error
    }
  }

  async getAllQuizzesWithAnalytics(): Promise<QuizWithAnalytics[]> {
    try {
      // Get all folders first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Get all quizzes for the user (across all folders)
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id, file_id, custom_name, folder_id')
        .eq('user_id', session.user.id)

      if (quizzesError) {
        throw new Error(`Failed to fetch quizzes: ${quizzesError.message}`)
      }

      if (!quizzes || quizzes.length === 0) {
        return []
      }

      // Get filenames for quizzes
      const fileIds = Array.from(new Set(quizzes.map(q => q.file_id)))
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('id, filename')
        .in('id', fileIds)
        .eq('user_id', session.user.id)

      const fileMap = new Map<string, string>()
      if (files) {
        files.forEach(f => fileMap.set(f.id, f.filename))
      }

      // Get analytics for each quiz
      const quizzesWithAnalytics: QuizWithAnalytics[] = []
      
      for (const quiz of quizzes) {
        try {
          const analytics = await this.getAnalytics(quiz.id)
          const displayName = quiz.custom_name || fileMap.get(quiz.file_id) || 'Untitled Quiz'
          
          quizzesWithAnalytics.push({
            id: quiz.id,
            display_name: displayName,
            filename: fileMap.get(quiz.file_id),
            custom_name: quiz.custom_name,
            accuracy_percentage: analytics.accuracy_percentage,
            total_attempted: analytics.total_attempted,
            total_correct: analytics.total_correct,
          })
        } catch (error) {
          // If analytics fetch fails (e.g., no interactions yet), skip this quiz
          console.warn(`Failed to get analytics for quiz ${quiz.id}:`, error)
        }
      }

      // Filter out quizzes with no attempts and sort by accuracy (lowest first)
      return quizzesWithAnalytics
        .filter(q => q.total_attempted > 0)
        .sort((a, b) => a.accuracy_percentage - b.accuracy_percentage)
    } catch (error) {
      console.error('Error fetching all quizzes with analytics:', error)
      throw error
    }
  }

  async getStudyStreak(): Promise<{
    current_streak: number
    longest_streak: number
    last_study_date: string | null
  }> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/analytics/streak`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        console.error('Study streak response not OK:', response.status, response.statusText)
        throw new Error(`Failed to fetch study streak: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('Study streak response data:', data)
      
      // Ensure we have valid numbers
      const result = {
        current_streak: typeof data.current_streak === 'number' ? data.current_streak : parseInt(data.current_streak) || 0,
        longest_streak: typeof data.longest_streak === 'number' ? data.longest_streak : parseInt(data.longest_streak) || 0,
        last_study_date: data.last_study_date || null,
      }
      
      console.log('Study streak parsed result:', result)
      return result
    } catch (error) {
      console.error('Error fetching study streak:', error)
      // Return defaults on error
      return {
        current_streak: 0,
        longest_streak: 0,
        last_study_date: null,
      }
    }
  }
}

export const quizService = new QuizService()
