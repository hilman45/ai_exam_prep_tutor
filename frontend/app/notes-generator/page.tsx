'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import GeneratorLayout from '../../components/GeneratorLayout'
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
      <GeneratorLayout
        title="AI Notes Generator"
        description="Upload a document, paste your notes to automatically generate summarize notes with AI."
        onFileSelect={handleFileSelect}
        onNext={handleNext}
        uploadedFile={uploadedFile}
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileInputChange={handleFileInputChange}
        onRemoveFile={() => setUploadedFile(null)}
      >

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
              <div className="space-y-6 mb-8">
                {/* Folder Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Folder
                  </label>
                  <div className="relative">
                    <button
                      className="folder-dropdown-button w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50/50"
                      onClick={() => setFolderDropdownOpen(!folderDropdownOpen)}
                    >
                      <span className="text-gray-900 font-medium">{selectedFolder}</span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${folderDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {folderDropdownOpen && (
                      <div className="folder-dropdown absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                        {foldersLoading ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            Loading folders...
                          </div>
                        ) : folders.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            No folders found
                          </div>
                        ) : (
                          folders.map((folder) => (
                            <button
                              key={folder.id}
                              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center space-x-2"
                              onClick={() => {
                                setSelectedFolder(folder.name)
                                setFolderDropdownOpen(false)
                              }}
                            >
                              <span className="w-2 h-2 rounded-full bg-primary/40"></span>
                              <span>{folder.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Note Name
                  </label>
                  <input
                    type="text"
                    value={notesName}
                    onChange={(e) => setNotesName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400 font-medium"
                    placeholder="e.g., Biology Chapter 1"
                  />
                </div>

                {/* Notes Type Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Format Type
                  </label>
                  <div className="relative">
                    <button
                      className="notes-type-dropdown-button w-full px-4 py-3 border border-gray-200 rounded-xl text-left flex items-center justify-between hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-gray-50/50"
                      onClick={() => setNotesTypeDropdownOpen(!notesTypeDropdownOpen)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="p-1 rounded-md bg-primary/10 text-primary">
                            {notesType === 'Bullet Points' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                            )}
                        </span>
                        <span className="text-gray-900 font-medium">{notesType}</span>
                      </div>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${notesTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {notesTypeDropdownOpen && (
                      <div className="notes-type-dropdown absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center space-x-2"
                          onClick={() => {
                            setNotesType('Short Summary')
                            setNotesTypeDropdownOpen(false)
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                          <span>Short Summary</span>
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center space-x-2"
                          onClick={() => {
                            setNotesType('Bullet Points')
                            setNotesTypeDropdownOpen(false)
                          }}
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                          <span>Bullet Points</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-purple-700 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center space-x-2"
                >
                  {isGenerating && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  <span>{isGenerating ? 'Generating...' : 'Generate Notes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </GeneratorLayout>
    </DashboardLayout>
  )
}
