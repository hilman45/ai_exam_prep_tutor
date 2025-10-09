'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../../lib/supabase'

export default function NotesGeneratorPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('Untitled')
  const [notesName, setNotesName] = useState('')
  const [notesType, setNotesType] = useState('Short Summary')
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false)
  const [notesTypeDropdownOpen, setNotesTypeDropdownOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const { user, error } = await authHelpers.getCurrentUser()
        
        if (error || !user) {
          // User not authenticated, redirect to login
          router.push('/login')
          return
        }

        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        router.push('/login')
      }
    }

    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/login')
        } else if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleSignOut = async () => {
    try {
      await authHelpers.signOut()
      authHelpers.clearTokens()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.profile-dropdown') && !target.closest('.profile-button')) {
        setProfileDropdownOpen(false)
      }
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

  const handleGenerate = () => {
    // TODO: Implement generate functionality
    console.log('Generate clicked:', {
      folder: selectedFolder,
      name: notesName,
      type: notesType,
      file: uploadedFile
    })
    handleCloseModal()
  }

  // Placeholder folders - in real implementation, this would come from the folder service
  const folders = ['Untitled', 'Study Materials', 'Lecture Notes', 'Practice Tests']

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-space-grotesk">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-space-grotesk">
      {/* Header */}
      <header className="bg-white border-b-2 border-black">
        <nav className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-dark">
                <span className="text-black">Prep</span>
                <span className="text-primary">Wise</span>
              </h1>
            </div>

            {/* Profile Icon with Dropdown */}
            <div className="relative">
              <button 
                className="profile-button w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary transition-colors"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="profile-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      // TODO: Navigate to profile page
                    }}
                  >
                    My Profile
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      handleSignOut()
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <div className="p-4">
            {/* Welcome Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {!sidebarCollapsed && (
                  <span className="text-sm text-gray-900">
                    Welcome, {user?.user_metadata?.username}
                  </span>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-6 h-6 rounded border border-gray-300 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              {/* Home */}
              <div 
                className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer group"
                onClick={() => router.push('/dashboard')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: '#7C3AED'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Home</span>}
              </div>

              {/* Notes - Active */}
              <div className="flex items-center space-x-3 py-2 px-3 rounded-lg bg-primary text-white transition-colors cursor-pointer group">
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-white">Notes</span>}
              </div>

              {/* Quiz */}
              <div className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer group">
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: '#FACC15'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Quiz</span>}
              </div>

              {/* Flashcards */}
              <div className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer group">
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: '#EF4444'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Flashcards</span>}
              </div>
            </nav>

            {/* Bottom Navigation */}
            <div className="mt-8 space-y-2">
              {/* Analytics */}
              <div className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer group">
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: '#22C55E'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Analytic Tracking</span>}
              </div>

              {/* Profile */}
              <div className="flex items-center space-x-3 py-2 px-3 rounded-lg hover:bg-primary hover:text-white transition-colors cursor-pointer group">
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: '#F472B6'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Profile</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white">
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
                      {folders.map((folder) => (
                        <button
                          key={folder}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => {
                            setSelectedFolder(folder)
                            setFolderDropdownOpen(false)
                          }}
                        >
                          {folder}
                        </button>
                      ))}
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
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
