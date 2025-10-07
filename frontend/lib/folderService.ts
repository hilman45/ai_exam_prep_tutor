// Folder service for API calls
import { supabase } from './supabase'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Folder {
  id: string
  name: string
  color: string
  created_at: string
  updated_at: string
  materials_count: number
  materials: {
    files: number
    summaries: number
    quizzes: number
    flashcards: number
  }
}

export interface CreateFolderRequest {
  name: string
  color?: string
}

export interface UpdateFolderRequest {
  name?: string
  color?: string
}

class FolderService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get the current session from Supabase
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  async getFolders(): Promise<Folder[]> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/folders/`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch folders: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching folders:', error)
      throw error
    }
  }

  async getFolder(folderId: string): Promise<Folder> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch folder: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching folder:', error)
      throw error
    }
  }

  async createFolder(folderData: CreateFolderRequest): Promise<Folder> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/folders/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(folderData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating folder:', error)
      throw error
    }
  }

  async updateFolder(folderId: string, folderData: UpdateFolderRequest): Promise<Folder> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(folderData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update folder: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating folder:', error)
      throw error
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        method: 'DELETE',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to delete folder: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
      throw error
    }
  }
}

export const folderService = new FolderService()
