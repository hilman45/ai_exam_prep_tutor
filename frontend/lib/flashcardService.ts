// Flashcard service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Flashcard {
  front: string
  back: string
}

export interface FlashcardSet {
  id: string
  file_id: string
  user_id: string
  cards: Flashcard[]
  folder_id: string
  created_at: string
  filename?: string
  custom_name?: string
  display_name?: string
}

export interface GenerateFlashcardResponse {
  flashcard_id: string
  cards: Flashcard[]
  card_count: number
  cached: boolean
  filename?: string
  created_at?: string
}

class FlashcardService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async generateFlashcards(fileId: string, count: number): Promise<GenerateFlashcardResponse> {
    try {
      const headers = await this.getAuthHeaders()
      
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/${fileId}?count=${count}`, {
        method: 'POST',
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to generate flashcards: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error generating flashcards:', error)
      throw error
    }
  }

  async getFlashcardsByFolder(folderId: string): Promise<FlashcardSet[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/folder/${folderId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flashcards: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching flashcards:', error)
      throw error
    }
  }

  async getFlashcard(flashcardId: string): Promise<FlashcardSet> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/${flashcardId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch flashcard: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching flashcard:', error)
      throw error
    }
  }

  async updateFlashcard(flashcardId: string, cards: Flashcard[]): Promise<FlashcardSet> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/${flashcardId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ cards }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update flashcard: ${response.statusText}`)
      }

      const result = await response.json()
      return result.flashcard
    } catch (error) {
      console.error('Error updating flashcard:', error)
      throw error
    }
  }

  async deleteFlashcard(flashcardId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/delete/flashcard/${flashcardId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to delete flashcard: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error)
      throw error
    }
  }
}

export const flashcardService = new FlashcardService()

