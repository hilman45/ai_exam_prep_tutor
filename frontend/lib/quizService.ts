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
}

export const quizService = new QuizService()
