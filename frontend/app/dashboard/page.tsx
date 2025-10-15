'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { folderService, Folder } from '../../lib/folderService'
import DashboardLayout from '../../components/DashboardLayout'

export default function DashboardPage() {
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(true)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Load folders when component mounts
    loadFolders()
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.folder-menu') && !target.closest('.folder-menu-button')) {
        setFolderMenuOpen(null)
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
        setSelectedFolderId(userFolders[0].id)
      }
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setFoldersLoading(false)
    }
  }

  const handleAddFolder = async () => {
    if (folderName.trim()) {
      try {
        const newFolder = await folderService.createFolder({
          name: folderName.trim()
        })
        setFolders(prev => [...prev, newFolder])
        setFolderName('')
        setAddFolderModalOpen(false)
      } catch (error) {
        console.error('Error creating folder:', error)
        // You could add a toast notification here
      }
    }
  }

  const handleCloseModal = () => {
    setFolderName('')
    setAddFolderModalOpen(false)
  }

  return (
    <DashboardLayout activeTab="home">
      <div className="p-6">
            {/* Dashboard Title */}
            <h1 className="text-2xl font-bold text-gray-800 mb-8">Dashboard</h1>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Notes Card */}
              <div 
                className="bg-white rounded-lg border-2 border-black p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-cyan-500 cursor-pointer"
                onClick={() => router.push('/notes-generator')}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#06B6D4'}}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">
                    Upload your lecture notes, PDFs, or documents.
                  </p>
                </div>
              </div>

              {/* Quiz Card */}
              <div 
                className="bg-white rounded-lg border-2 border-black p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-yellow-400 cursor-pointer"
                onClick={() => router.push('/quiz-generator')}
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#FACC15'}}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Quiz</h3>
                  <p className="text-sm text-gray-600">
                    Create practice quizzes from your uploaded materials.
                  </p>
                </div>
              </div>

              {/* Flashcards Card */}
              <div className="bg-white rounded-lg border-2 border-black p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-red-500">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#EF4444'}}>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Flashcards</h3>
                  <p className="text-sm text-gray-600">
                    Generate flashcards to memorize key concepts and terms.
                  </p>
                </div>
              </div>
            </div>

          

            {/* Folders Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h2 className="text-lg font-semibold text-gray-800">Folder</h2>
                </div>
                <button 
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
                  onClick={() => setAddFolderModalOpen(true)}
                >
                  Add Folder
                </button>
              </div>

              {/* Separator between Folder text and folders */}
              <div className="border-t border-gray-200 mb-4"></div>

              {/* Folders List */}
              {foldersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600">Loading folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No folders found. Create your first folder!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {folders.map((folder) => (
                    <div 
                      key={folder.id}
                      className={`border border-slate-200 rounded-lg p-4 hover:brightness-95 hover:shadow-sm transition-all max-w-md relative cursor-pointer ${
                        selectedFolderId === folder.id ? 'ring-2 ring-primary' : ''
                      }`}
                      style={{backgroundColor: folder.color}}
                      onClick={() => router.push(`/folders/${folder.id}?name=${encodeURIComponent(folder.name)}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-slate-800 mb-2">{folder.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-slate-800">
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{folder.materials_count} Materials</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{new Date(folder.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Kebab Menu */}
                        <div className="relative">
                          <button 
                            className="folder-menu-button p-1 rounded hover:bg-gray-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)
                            }}
                          >
                            <svg className="w-4 h-4 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {/* Folder Menu Dropdown */}
                          {folderMenuOpen === folder.id && (
                            <div className="folder-menu absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button 
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // TODO: Implement rename functionality
                                }}
                              >
                                Rename
                              </button>
                              <button 
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // TODO: Implement delete functionality
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

      {/* Add Folder Modal */}
      {addFolderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Folder</h2>
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
            <div className="mb-6">
              <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter folder name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddFolder()
                  } else if (e.key === 'Escape') {
                    handleCloseModal()
                  }
                }}
              />
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
                onClick={handleAddFolder}
                disabled={!folderName.trim()}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

