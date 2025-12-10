// Chat service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  notes: string
}

export interface ChatResponse {
  reply: string
}

export interface QuizChatRequest {
  message: string
  question?: string | null
  options?: string[] | null
  correct_answer?: string | null
  user_answer?: string | null
  topic_name?: string | null
  explanation?: string | null
  all_questions?: Array<{
    question: string
    options: string[]
    answer_index: number
  }> | null
  quiz_name?: string | null
}

class ChatService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async sendMessage(message: string, notes: string): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          notes
        } as ChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending chat message:', error)
      throw error
    }
  }

  async sendQuizMessage(
    message: string,
    question?: string | null,
    options?: string[] | null,
    correctAnswer?: string | null,
    userAnswer?: string | null,
    topicName?: string | null,
    explanation?: string | null,
    allQuestions?: Array<{
      question: string
      options: string[]
      answer_index: number
    }> | null,
    quizName?: string | null
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/quiz`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          question: question || null,
          options: options || null,
          correct_answer: correctAnswer || null,
          user_answer: userAnswer || null,
          topic_name: topicName || null,
          explanation: explanation || null,
          all_questions: allQuestions || null,
          quiz_name: quizName || null
        } as QuizChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending quiz chat message:', error)
      throw error
    }
  }
}

export const chatService = new ChatService()
