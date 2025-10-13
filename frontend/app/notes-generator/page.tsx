'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { supabase } from '../../lib/supabase'
import { folderService, Folder } from '../../lib/folderService'

export default function NotesGeneratorPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('Untitled')
  const [notesName, setNotesName] = useState('')
  const [notesType, setNotesType] = useState('Short Summary')
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)
  const [notesTypeDropdownOpen, setNotesTypeDropdownOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(true)
  const router = useRouter()

  // Load folders on component mount
  useEffect(() => {
    loadFolders()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.folder-dropdown') && !target.closest('.folder-dropdown-button')) {
        setFolderDropdownOpen(false)
      }
      if (!target.closest('.notes-type-dropdown') && !target.closest('.notes-type-dropdown-button')) {
        setNotesTypeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadFolders = async () => {
    try {
      setFoldersLoading(true)
      const userFolders = await folderService.getFolders()
      setFolders(userFolders)
      
      // Set the first folder as selected (usually the "Untitled" folder)
      if (userFolders.length > 0) {
        setSelectedFolder(userFolders[0].name)
      }
    } catch (error) {
      console.error('Error loading folders:', error)
      setError('Failed to load folders. Please try again.')
    } finally {
      setFoldersLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid file type (PDF, DOCX, TXT, or image)')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setUploadedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleNext = () => {
    if (uploadedFile) {
      setModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setFolderDropdownOpen(false)
    setNotesTypeDropdownOpen(false)
  }

  const handleGenerate = async () => {
    if (!uploadedFile || !notesName.trim()) {
      setError('Please provide a file and notes name')
      return
    }

    setIsGenerating(true)
    setError(null)
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to generate notes')
        return
      }

      // Find the selected folder ID
      const selectedFolderObj = folders.find(f => f.name === selectedFolder)
      const folderId = selectedFolderObj?.id || null

      // Upload file first
      const formData = new FormData()
      formData.append('file', uploadedFile)
      if (folderId) {
        formData.append('folder_id', folderId)
      }
      
      const uploadResponse = await fetch('http://localhost:8000/files/upload_file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to upload file')
      }

      const uploadData = await uploadResponse.json()
      const fileId = uploadData.file_id

      // Generate summary
      const formatType = notesType === 'Bullet Points' ? 'bullet_points' : 'normal'
      const summaryResponse = await fetch(`http://localhost:8000/ai/summarize/${fileId}?format_type=${formatType}&custom_name=${encodeURIComponent(notesName.trim())}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to generate summary')
      }

      const summaryData = await summaryResponse.json()

      // Navigate to notes page with generated content
      const notesData = {
        fileId,
        summaryId: summaryData.summary_id,
        notesName: notesName.trim(),
        folderName: selectedFolder,
        summaryText: summaryData.summary_text,
        formatType: notesType,
        filename: uploadedFile.name
      }

      // Store notes data in sessionStorage for the notes page
      sessionStorage.setItem('generatedNotes', JSON.stringify(notesData))
      
      // Navigate to notes page
      router.push('/notes')
      
      handleCloseModal()
    } catch (error) {
      console.error('Error generating notes:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate notes. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }


  return (
    <DashboardLayout activeTab="notes">
      <div className="p-6">
            {/* Page Title */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Notes Generator</h1>
            
            {/* Description */}
            <p className="text-gray-600 mb-8 text-lg">
              Upload a document, paste your notes to automatically generate summarize notes with AI.
            </p>

            {/* File Upload Section */}
            <div className="max-w-2xl">
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
                  isDragOver 
                    ? 'border-primary bg-primary bg-opacity-5' 
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                }`}
                style={{ backgroundColor: '#F0F2F9' }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                />
                
                {uploadedFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-800 mb-2">{uploadedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setUploadedFile(null)
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-800 mb-2">
                        Drag a document here or click browser
                      </p>
                      <p className="text-sm text-gray-600">
                        Supports PDF, DOCX, TXT, and image files
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <div className="mt-8">
                <button
                  onClick={handleNext}
                  disabled={!uploadedFile}
                  className="w-full sm:w-auto px-8 py-3 bg-white border-2 border-black rounded-lg font-medium text-gray-800 hover:bg-gray-50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

      {/* Generate Notes Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Generate Notes</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Modal Body */}
            <div className="space-y-4 mb-6">
              {/* Folder Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Folder:
                </label>
                <div className="relative">
                  <button
                    className="folder-dropdown-button w-full px-3 py-2 border border-black rounded-lg text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => setFolderDropdownOpen(!folderDropdownOpen)}
                  >
                    <span className="text-gray-900">{selectedFolder}</span>
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {folderDropdownOpen && (
                    <div className="folder-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      {foldersLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Loading folders...
                        </div>
                      ) : folders.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No folders found
                        </div>
                      ) : (
                        folders.map((folder) => (
                          <button
                            key={folder.id}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            onClick={() => {
                              setSelectedFolder(folder.name)
                              setFolderDropdownOpen(false)
                            }}
                          >
                            {folder.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Name:
                </label>
                <input
                  type="text"
                  value={notesName}
                  onChange={(e) => setNotesName(e.target.value)}
                  className="w-full px-3 py-2 border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter notes name"
                />
              </div>

              {/* Notes Type Dropdown */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Notes Type:
                </label>
                <div className="relative">
                  <button
                    className="notes-type-dropdown-button w-full px-3 py-2 border border-black rounded-lg text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => setNotesTypeDropdownOpen(!notesTypeDropdownOpen)}
                  >
                    <span className="text-gray-900">{notesType}</span>
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {notesTypeDropdownOpen && (
                    <div className="notes-type-dropdown absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors rounded-t-lg"
                        onClick={() => {
                          setNotesType('Short Summary')
                          setNotesTypeDropdownOpen(false)
                        }}
                      >
                        Short Summary
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors rounded-b-lg"
                        onClick={() => {
                          setNotesType('Bullet Points')
                          setNotesTypeDropdownOpen(false)
                        }}
                      >
                        Bullet Points
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isGenerating && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
