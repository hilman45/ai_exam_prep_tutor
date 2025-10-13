'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notesService, Summary } from '../../lib/notesService'
import { folderService, Folder } from '../../lib/folderService'
import DashboardLayout from '../../components/DashboardLayout'

interface GeneratedNotesData {
  fileId: string
  summaryId: string
  notesName: string
  folderName: string
  summaryText: string
  filename: string
  createdAt: string
}


export default function NotesPage() {
  const [notesData, setNotesData] = useState<GeneratedNotesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadNotesData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get parameters from URL
        const summaryId = searchParams.get('summaryId')
        const folderId = searchParams.get('folderId')
        const folderName = searchParams.get('folderName')

        if (!summaryId) {
          // Fallback to sessionStorage for backward compatibility
          const storedNotes = sessionStorage.getItem('generatedNotes')
          if (storedNotes) {
            try {
              const parsedNotes = JSON.parse(storedNotes)
              setNotesData(parsedNotes)
              setEditedContent(parsedNotes.summaryText)
              return
            } catch (error) {
              console.error('Error parsing notes data:', error)
              setError('Invalid notes data. Please generate new notes.')
              return
            }
          } else {
            setError('No notes specified. Please select notes from a folder.')
            return
          }
        }

        // Fetch summary from database
        const summary = await notesService.getSummary(summaryId)
        console.log('Fetched summary:', summary) // Debug log
        
        // Get folder name if not provided
        let finalFolderName = folderName
        if (!finalFolderName && folderId) {
          try {
            const folders = await folderService.getFolders()
            const folder = folders.find(f => f.id === folderId)
            finalFolderName = folder?.name || 'Unknown Folder'
          } catch (error) {
            console.error('Error fetching folder:', error)
            finalFolderName = 'Unknown Folder'
          }
        }

        // Create notes data object
        const notesData: GeneratedNotesData = {
          fileId: summary.file_id,
          summaryId: summary.id,
          notesName: summary.custom_name || summary.display_name || summary.filename || 'Generated Notes',
          folderName: finalFolderName || 'Unknown Folder',
          summaryText: summary.summary_text,
          filename: summary.filename || 'Unknown file', // Always use original filename for Source field
          createdAt: summary.created_at
        }

        setNotesData(notesData)
        setEditedContent(summary.summary_text)

      } catch (error) {
        console.error('Error loading notes:', error)
        setError('Failed to load notes. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadNotesData()
  }, [searchParams, router])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!notesData) return
    
    try {
      setIsSaving(true)
      setError(null)
      
      // Call the backend API to update the summary
      const updatedSummary = await notesService.updateSummary(notesData.summaryId, editedContent)
      
      // Update local state with the saved content
      setNotesData(prev => prev ? {
        ...prev,
        summaryText: updatedSummary.summary_text
      } : null)
      
      setIsEditing(false)
      console.log('Successfully saved edited content')
      
    } catch (error) {
      console.error('Error saving notes:', error)
      setError('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedContent(notesData?.summaryText || '')
  }

  const handleBackToFolders = () => {
    // Clear session storage and navigate back
    sessionStorage.removeItem('generatedNotes')
    
    // Navigate back to the specific folder if we have the folderId
    const folderId = searchParams.get('folderId')
    if (folderId) {
      const folderName = searchParams.get('folderName')
      const params = new URLSearchParams()
      if (folderName) params.set('name', folderName)
      router.push(`/folders/${folderId}?${params.toString()}`)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="notes">
        <div className="p-6 flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!notesData) {
    return (
      <DashboardLayout activeTab="notes">
        <div className="p-6 text-center min-h-96">
          {error ? (
            <div>
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
              <button
                onClick={() => router.push('/notes-generator')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Generate New Notes
              </button>
            </div>
          ) : (
            <p className="text-gray-600">No notes found. Redirecting...</p>
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="notes">
      <div className="p-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBackToFolders}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{notesData.notesName}</h1>
                <p className="text-sm text-gray-600">in {notesData.folderName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
            </div>
          </div>
          
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Source: {notesData.filename}</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Generated: {notesData.createdAt ? new Date(notesData.createdAt).toLocaleString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Notes Content Area */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-96 p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Start editing your notes..."
              />
            ) : (
              <div className="min-h-96 p-4 border border-gray-200 rounded-lg bg-white">
                <div className="prose max-w-none">
                  <div className="whitespace-pre-line text-gray-800 leading-relaxed">
                    {editedContent}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
