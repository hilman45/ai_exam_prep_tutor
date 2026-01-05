'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import GeneratorLayout from '../../components/GeneratorLayout'
import { supabase } from '../../lib/supabase'
import { folderService, Folder } from '../../lib/folderService'

export default function FlashcardGeneratorPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('Untitled')
  const [flashcardName, setFlashcardName] = useState('')
  const [cardCount, setCardCount] = useState(10)
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)
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
  }

  const handleGenerate = async () => {
    if (!uploadedFile || !flashcardName.trim()) {
      setError('Please provide a file and flashcard name')
      return
    }

    if (cardCount < 5 || cardCount > 30) {
      setError('Card count must be between 5 and 30')
      return
    }

    setIsGenerating(true)
    setError(null)
    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please log in to generate flashcards')
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

      // Generate flashcards
      const queryParams = new URLSearchParams({
        count: cardCount.toString()
      })
      if (flashcardName.trim()) {
        queryParams.append('custom_name', flashcardName.trim())
      }
      
      const flashcardResponse = await fetch(`http://localhost:8000/ai/flashcards/${fileId}?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!flashcardResponse.ok) {
        const errorData = await flashcardResponse.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to generate flashcards')
      }

      const flashcardData = await flashcardResponse.json()

      // Navigate to flashcards page with generated content (or store in sessionStorage for later)
      const flashcardsData = {
        fileId,
        flashcardId: flashcardData.flashcard_id,
        flashcardName: flashcardName.trim(),
        folderName: selectedFolder,
        cards: flashcardData.cards,
        cardCount: flashcardData.card_count,
        filename: uploadedFile.name,
        cached: flashcardData.cached
      }

      // Store flashcard data in sessionStorage for the edit page
      sessionStorage.setItem('generatedFlashcards', JSON.stringify(flashcardsData))
      
      // Navigate to flashcard edit page
      router.push('/flashcard-edit')
      
      handleCloseModal()
    } catch (error) {
      console.error('Error generating flashcards:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate flashcards. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <DashboardLayout activeTab="flashcards">
      <GeneratorLayout
        title="Flashcards Generator"
        description="Upload your study materials to automatically generate flashcards for quick revision."
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
        {/* Generate Flashcards Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Generate Flashcards</h2>
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
                    Flashcard Name
                  </label>
                  <input
                    type="text"
                    value={flashcardName}
                    onChange={(e) => setFlashcardName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-gray-400 font-medium"
                    placeholder="e.g., Physics Terminology"
                  />
                </div>

                {/* Card Count Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Flashcards
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={cardCount}
                      onChange={(e) => setCardCount(parseInt(e.target.value) || 5)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                      placeholder="Enter number of flashcards (5-30)"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium bg-white px-2 py-1 rounded-md border border-gray-100">
                        5-30 cards
                    </div>
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
                  <span>{isGenerating ? 'Generating...' : 'Generate Flashcards'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </GeneratorLayout>
    </DashboardLayout>
  )
}

