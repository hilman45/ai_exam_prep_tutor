// Notes service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Summary {
  id: string
  file_id: string
  user_id: string
  summary_text: string
  folder_id: string
  created_at: string
  filename?: string
  custom_name?: string
  display_name?: string
}

export interface File {
  id: string
  filename: string
  user_id: string
  text_content: string
  folder_id: string
  created_at: string
}

class NotesService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async getSummariesByFolder(folderId: string): Promise<Summary[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/summaries/folder/${folderId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch summaries: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching summaries:', error)
      throw error
    }
  }

  async getFilesByFolder(folderId: string): Promise<File[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/files/folder/${folderId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching files:', error)
      throw error
    }
  }

  async getSummary(summaryId: string): Promise<Summary> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/summaries/${summaryId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching summary:', error)
      throw error
    }
  }

  async updateSummary(summaryId: string, summaryText: string): Promise<Summary> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/ai/summaries/${summaryId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ summary_text: summaryText }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update summary: ${response.statusText}`)
      }

      const result = await response.json()
      return result.summary
    } catch (error) {
      console.error('Error updating summary:', error)
      throw error
    }
  }

}

export const notesService = new NotesService()
