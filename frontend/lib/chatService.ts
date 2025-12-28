// Chat service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  questions?: Array<{
    question: string
    options: string[]
    answer_index: number
  }>
  flashcards?: Array<{
    front: string
    back: string
  }>
  isUpdatedNotes?: boolean
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

export interface FlashcardChatRequest {
  message: string
  front?: string | null
  back?: string | null
  topic_name?: string | null
  all_flashcards?: Array<{
    front: string
    back: string
  }> | null
  flashcard_set_name?: string | null
}

export interface QuizEditChatRequest {
  message: string
  current_questions?: Array<{
    question: string
    options: string[]
    answer_index: number
  }> | null
  quiz_name?: string | null
  filename?: string | null
  selected_question?: {
    question: string
    options: string[]
    answer_index: number
  } | null
}

export interface FlashcardEditChatRequest {
  message: string
  current_flashcards?: Array<{
    front: string
    back: string
  }> | null
  flashcard_name?: string | null
  filename?: string | null
  selected_flashcard?: {
    front: string
    back: string
  } | null
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

  async sendFlashcardMessage(
    message: string,
    front?: string | null,
    back?: string | null,
    topicName?: string | null,
    allFlashcards?: Array<{
      front: string
      back: string
    }> | null,
    flashcardSetName?: string | null
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/flashcard`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          front: front || null,
          back: back || null,
          topic_name: topicName || null,
          all_flashcards: allFlashcards || null,
          flashcard_set_name: flashcardSetName || null
        } as FlashcardChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending flashcard chat message:', error)
      throw error
    }
  }

  async sendQuizEditMessage(
    message: string,
    currentQuestions?: Array<{
      question: string
      options: string[]
      answer_index: number
    }> | null,
    quizName?: string | null,
    filename?: string | null,
    selectedQuestion?: {
      question: string
      options: string[]
      answer_index: number
    } | null
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/quiz-edit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          current_questions: currentQuestions || null,
          quiz_name: quizName || null,
          filename: filename || null,
          selected_question: selectedQuestion || null
        } as QuizEditChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending quiz edit chat message:', error)
      throw error
    }
  }

  async sendFlashcardEditMessage(
    message: string,
    currentFlashcards?: Array<{
      front: string
      back: string
    }> | null,
    flashcardName?: string | null,
    filename?: string | null,
    selectedFlashcard?: {
      front: string
      back: string
    } | null
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/flashcard-edit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          current_flashcards: currentFlashcards || null,
          flashcard_name: flashcardName || null,
          filename: filename || null,
          selected_flashcard: selectedFlashcard || null
        } as FlashcardEditChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending flashcard edit chat message:', error)
      throw error
    }
  }

  async sendNotesEditMessage(
    message: string,
    currentNotes?: string | null,
    notesName?: string | null,
    filename?: string | null
  ): Promise<string> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/api/chat/notes-edit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          current_notes: currentNotes || null,
          notes_name: notesName || null,
          filename: filename || null
        } as NotesEditChatRequest),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }))
        throw new Error(errorData.detail || `Failed to send message: ${response.statusText}`)
      }

      const data: ChatResponse = await response.json()
      return data.reply
    } catch (error) {
      console.error('Error sending notes edit chat message:', error)
      throw error
    }
  }
}

export interface NotesEditChatRequest {
  message: string
  current_notes?: string | null
  notes_name?: string | null
  filename?: string | null
}

export const chatService = new ChatService()
