'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notesService, Summary } from '../../lib/notesService'
import { folderService, Folder } from '../../lib/folderService'
import DashboardLayout from '../../components/DashboardLayout'
import NotesChat from '../../components/NotesChat'

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
  const [aiGeneratedNotes, setAiGeneratedNotes] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
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
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium">Loading your notes...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!notesData) {
    return (
      <DashboardLayout activeTab="notes">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
          <div className="text-center max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-6">{error || 'No notes found.'}</p>
            <button
              onClick={() => router.push('/notes-generator')}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-all font-medium shadow-sm hover:shadow-md"
            >
              Generate New Notes
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="notes">
      <div className="min-h-screen bg-gray-50/50 pb-20">
        {/* Top Navigation Bar */}
        <div className="sticky top-16 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToFolders}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
                title="Back to Folder"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-0.5">
                  <span>Folders</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-700">{notesData.folderName}</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 leading-none">{notesData.notesName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Notes
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm hover:shadow flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-5xl mx-auto px-6 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}

          <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 transition-all duration-300 ${isEditing ? 'ring-2 ring-primary/10 shadow-md' : ''}`}>
            {/* Metadata Header */}
            <div className="px-8 py-4 border-b border-gray-100 flex flex-wrap items-center gap-6 text-sm text-gray-500 bg-gray-50/30 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Source:</span>
                <span className="text-gray-700">{notesData.filename}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Created:</span>
                <span className="text-gray-700">{new Date(notesData.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Content Editor/Viewer */}
            <div className="p-8 min-h-[60vh]">
              {isEditing ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[60vh] p-0 border-0 focus:ring-0 text-gray-800 leading-relaxed resize-none text-lg font-normal placeholder-gray-300"
                  placeholder="Start writing your notes here..."
                  spellCheck={false}
                />
              ) : (
                <div className="prose prose-slate max-w-none lg:prose-lg prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-p:text-gray-700 prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl">
                  <div 
                    className="whitespace-pre-wrap"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    {editedContent}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Chat Panel - Only visible when in edit mode */}
      {isEditing && notesData && (
        <NotesChat 
          notes={editedContent || notesData.summaryText}
          notesName={notesData.notesName}
          filename={notesData.filename}
          onNotesUpdated={(updatedNotes: string) => {
            setAiGeneratedNotes(updatedNotes)
            setShowPreviewModal(true)
          }}
        />
      )}

      {/* Preview Modal for AI Generated Notes */}
      {showPreviewModal && aiGeneratedNotes && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all"
          onClick={() => {
            setAiGeneratedNotes(null)
            setShowPreviewModal(false)
          }}
        >
          <div 
            className="bg-white rounded-2xl p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Review AI Suggestions</h3>
                <p className="text-sm text-gray-500">The AI has generated an updated version of your notes.</p>
              </div>
              <button
                onClick={() => {
                  setAiGeneratedNotes(null)
                  setShowPreviewModal(false)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="prose max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  >
                    {aiGeneratedNotes}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => {
                  setAiGeneratedNotes(null)
                  setShowPreviewModal(false)
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  // Add to current notes
                  const currentNotes = editedContent || notesData?.summaryText || ''
                  const combinedNotes = currentNotes + '\n\n' + aiGeneratedNotes
                  setEditedContent(combinedNotes)
                  setAiGeneratedNotes(null)
                  setShowPreviewModal(false)
                }}
                className="px-5 py-2.5 bg-white border border-primary text-primary rounded-xl hover:bg-primary/5 transition-colors font-medium"
              >
                Append to Bottom
              </button>
              <button
                onClick={async () => {
                  // Replace current notes
                  setEditedContent(aiGeneratedNotes)
                  setAiGeneratedNotes(null)
                  setShowPreviewModal(false)
                }}
                className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-colors font-medium shadow-sm hover:shadow"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
