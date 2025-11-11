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

export interface FlashcardReviewRequest {
  flashcard_id: number
  rating: 'again' | 'good' | 'easy'
  time_taken: number
}

export interface FlashcardCardState {
  flashcard_id: number
  interval: number
  due_time: string
  correct_streak: number
  easy_count: number
  is_finished: boolean
}

export interface FlashcardDailyAnalytics {
  date: string
  total_reviewed: number
  again_count: number
  good_count: number
  easy_count: number
  total_finished: number
  total_time_spent: number
}

export interface FlashcardSetWithAnalytics {
  id: string
  display_name: string
  filename?: string
  custom_name?: string
  again_rate: number
  total_reviewed: number
  again_count: number
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

  // Flashcard Analytics Methods
  async recordReview(flashcardSetId: string, review: FlashcardReviewRequest): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/${flashcardSetId}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify(review),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to record review: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error recording flashcard review:', error)
      throw error
    }
  }

  async getCardStates(flashcardSetId: string): Promise<FlashcardCardState[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/${flashcardSetId}/card-states`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch card states: ${response.statusText}`)
      }

      const data = await response.json()
      return data.card_states || []
    } catch (error) {
      console.error('Error fetching card states:', error)
      throw error
    }
  }

  async getDailyAnalytics(): Promise<FlashcardDailyAnalytics> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/flashcards/analytics/daily`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch daily analytics: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching daily analytics:', error)
      throw error
    }
  }

  async getAllFlashcardSetsWithAnalytics(): Promise<FlashcardSetWithAnalytics[]> {
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      // Get all flashcard sets for the user (across all folders)
      const { data: flashcardSets, error: flashcardsError } = await supabase
        .from('flashcards')
        .select('id, file_id, custom_name, folder_id')
        .eq('user_id', session.user.id)

      if (flashcardsError) {
        throw new Error(`Failed to fetch flashcards: ${flashcardsError.message}`)
      }

      if (!flashcardSets || flashcardSets.length === 0) {
        return []
      }

      // Get filenames for flashcard sets
      const fileIds = Array.from(new Set(flashcardSets.map(f => f.file_id)))
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('id, filename')
        .in('id', fileIds)
        .eq('user_id', session.user.id)

      const fileMap = new Map<string, string>()
      if (files) {
        files.forEach(f => fileMap.set(f.id, f.filename))
      }

      // Get card states for each flashcard set to calculate again rate
      const flashcardSetsWithAnalytics: FlashcardSetWithAnalytics[] = []
      
      for (const flashcardSet of flashcardSets) {
        try {
          const cardStates = await this.getCardStates(flashcardSet.id)
          
          // Calculate again rate from card states
          // We'll query flashcard_reviews to get the actual again count
          const { data: reviews, error: reviewsError } = await supabase
            .from('flashcard_reviews')
            .select('rating')
            .eq('flashcard_set_id', flashcardSet.id)
            .eq('user_id', session.user.id)

          if (reviewsError) {
            console.warn(`Failed to get reviews for flashcard ${flashcardSet.id}:`, reviewsError)
            continue
          }

          if (!reviews || reviews.length === 0) {
            continue // Skip flashcard sets with no reviews
          }

          const againCount = reviews.filter(r => r.rating === 'again').length
          const totalReviewed = reviews.length
          const againRate = totalReviewed > 0 ? (againCount / totalReviewed) * 100 : 0

          const displayName = flashcardSet.custom_name || fileMap.get(flashcardSet.file_id) || 'Untitled Flashcard Set'
          
          flashcardSetsWithAnalytics.push({
            id: flashcardSet.id,
            display_name: displayName,
            filename: fileMap.get(flashcardSet.file_id),
            custom_name: flashcardSet.custom_name,
            again_rate: againRate,
            total_reviewed: totalReviewed,
            again_count: againCount,
          })
        } catch (error) {
          // If analytics fetch fails, skip this flashcard set
          console.warn(`Failed to get analytics for flashcard ${flashcardSet.id}:`, error)
        }
      }

      // Sort by again rate (highest first)
      return flashcardSetsWithAnalytics
        .filter(f => f.total_reviewed > 0)
        .sort((a, b) => b.again_rate - a.again_rate)
    } catch (error) {
      console.error('Error fetching all flashcard sets with analytics:', error)
      throw error
    }
  }
}

export const flashcardService = new FlashcardService()

