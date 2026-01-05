'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { folderService, Folder } from '../../lib/folderService'
import { quizService } from '../../lib/quizService'
import { supabase, authHelpers } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'

interface StudyStreak {
  current_streak: number
  longest_streak: number
  last_study_date: string | null
}

const FOLDERS_CACHE_KEY = 'dashboard_folders_cache'
const FOLDERS_CACHE_TIMESTAMP_KEY = 'dashboard_folders_cache_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Folder color palette
const FOLDER_COLORS = [
  '#E9D5FF', // Light Lavender
  '#BAE6FD', // Sky Blue
  '#BBF7D0', // Mint Green
  '#FEF9C3', // Soft Yellow
  '#FBCFE8', // Blush Pink
  '#FED7AA', // Pale Orange
]

export default function DashboardPage() {
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS[0])
  const [folders, setFolders] = useState<Folder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false) // Start with false for instant display
  const [isInitialLoad, setIsInitialLoad] = useState(true) // Track if we're showing cached data
  const [studyStreak, setStudyStreak] = useState<StudyStreak | null>(null)
  const [streakLoading, setStreakLoading] = useState(true)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ folder: Folder | null }>({ folder: null })
  const [deleting, setDeleting] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [pictureModalOpen, setPictureModalOpen] = useState(false)
  const [folderToUpdatePicture, setFolderToUpdatePicture] = useState<Folder | null>(null)
  const [pictureFile, setPictureFile] = useState<File | null>(null)
  const [picturePreview, setPicturePreview] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkUser = async () => {
      try {
        const { user, error } = await authHelpers.getCurrentUser()
        if (!error && user) {
          setUser(user)
        }
      } catch (error) {
        console.error('Error checking user:', error)
      }
    }
    checkUser()
    
    // Load folders and streak when component mounts
    loadFolders()
    loadStudyStreak()
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

  // Load cached folders from localStorage
  const loadCachedFolders = (): Folder[] | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem(FOLDERS_CACHE_KEY)
      const timestamp = localStorage.getItem(FOLDERS_CACHE_TIMESTAMP_KEY)
      
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp, 10)
        // Use cache if it's less than 5 minutes old
        if (cacheAge < CACHE_DURATION) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.error('Error loading cached folders:', error)
    }
    
    return null
  }

  // Save folders to cache
  const saveFoldersToCache = (folders: Folder[]) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(FOLDERS_CACHE_KEY, JSON.stringify(folders))
      localStorage.setItem(FOLDERS_CACHE_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error('Error saving folders to cache:', error)
    }
  }

  const loadFolders = async () => {
    // First, try to load from cache for instant display
    const cachedFolders = loadCachedFolders()
    if (cachedFolders) {
      setFolders(cachedFolders)
      setIsInitialLoad(false)
    }
    
    // Then fetch fresh data in the background
    try {
      setFoldersLoading(true)
      const userFolders = await folderService.getFolders()
      setFolders(userFolders)
      saveFoldersToCache(userFolders)
      setIsInitialLoad(false)
    } catch (error) {
      console.error('Error loading folders:', error)
      // If fetch fails and we have no cache, show error state
      if (!cachedFolders) {
        setIsInitialLoad(false)
      }
    } finally {
      setFoldersLoading(false)
    }
  }

  const handleAddFolder = async () => {
    if (folderName.trim()) {
      try {
        const newFolder = await folderService.createFolder({
          name: folderName.trim(),
          color: selectedColor
        })
        const updatedFolders = [...folders, newFolder]
        setFolders(updatedFolders)
        saveFoldersToCache(updatedFolders) // Update cache
        setFolderName('')
        setSelectedColor(FOLDER_COLORS[0])
        setAddFolderModalOpen(false)
      } catch (error) {
        console.error('Error creating folder:', error)
        // You could add a toast notification here
      }
    }
  }

  const handleCloseModal = () => {
    setFolderName('')
    setSelectedColor(FOLDER_COLORS[0])
    setAddFolderModalOpen(false)
  }

  const handleRenameFolder = (folder: Folder) => {
    setFolderToRename(folder)
    setNewFolderName(folder.name)
    setRenameModalOpen(true)
    setFolderMenuOpen(null)
  }

  const handleSetPicture = (folder: Folder) => {
    setFolderToUpdatePicture(folder)
    setPictureFile(null)
    setPicturePreview(folder.picture_url || null)
    setPictureModalOpen(true)
    setFolderMenuOpen(null)
  }

  const handlePictureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }

      setPictureFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPicturePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadFolderPicture = async (file: File): Promise<string | null> => {
    if (!user) return null
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `folder-${folderToUpdatePicture?.id}-${Date.now()}.${fileExt}`
      const filePath = `folder-pictures/${fileName}`

      // Try to upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.warn('Storage upload failed, using data URL:', uploadError.message)
        
        // Convert to data URL (only if file is small enough)
        if (file.size < 2 * 1024 * 1024) { // 2MB limit for data URLs
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
        } else {
          throw new Error('File too large for data URL. Please set up Supabase Storage.')
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading folder picture:', error)
      return null
    }
  }

  const handleSavePicture = async () => {
    if (!folderToUpdatePicture || !pictureFile) return

    try {
      setUploadingPicture(true)
      const pictureUrl = await uploadFolderPicture(pictureFile)
      
      if (pictureUrl) {
        const updatedFolder = await folderService.updateFolder(folderToUpdatePicture.id, {
          picture_url: pictureUrl
        })
        
        const updatedFolders = folders.map(f => 
          f.id === folderToUpdatePicture.id ? { ...f, picture_url: updatedFolder.picture_url } : f
        )
        setFolders(updatedFolders)
        saveFoldersToCache(updatedFolders)
        
        setPictureModalOpen(false)
        setFolderToUpdatePicture(null)
        setPictureFile(null)
        setPicturePreview(null)
      } else {
        alert('Failed to upload picture. Please try again.')
      }
    } catch (error) {
      console.error('Error saving folder picture:', error)
      alert('Failed to save picture. Please try again.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleRemovePicture = async () => {
    if (!folderToUpdatePicture) return

    try {
      setUploadingPicture(true)
      const updatedFolder = await folderService.updateFolder(folderToUpdatePicture.id, {
        picture_url: null
      })
      
      const updatedFolders = folders.map(f => 
        f.id === folderToUpdatePicture.id ? { ...f, picture_url: null } : f
      )
      setFolders(updatedFolders)
      saveFoldersToCache(updatedFolders)
      
      setPictureModalOpen(false)
      setFolderToUpdatePicture(null)
      setPictureFile(null)
      setPicturePreview(null)
    } catch (error) {
      console.error('Error removing folder picture:', error)
      alert('Failed to remove picture. Please try again.')
    } finally {
      setUploadingPicture(false)
    }
  }

  const handleClosePictureModal = () => {
    setPictureModalOpen(false)
    setFolderToUpdatePicture(null)
    setPictureFile(null)
    setPicturePreview(null)
  }

  const handleCloseRenameModal = () => {
    setRenameModalOpen(false)
    setFolderToRename(null)
    setNewFolderName('')
  }

  const confirmRename = async () => {
    if (!folderToRename || !newFolderName.trim()) return

    try {
      setRenaming(true)
      const updatedFolder = await folderService.updateFolder(folderToRename.id, {
        name: newFolderName.trim()
      })
      
      // Update the folder in the list
      const updatedFolders = folders.map(f => 
        f.id === folderToRename.id ? { ...f, name: updatedFolder.name } : f
      )
      setFolders(updatedFolders)
      saveFoldersToCache(updatedFolders)
      
      handleCloseRenameModal()
    } catch (error) {
      console.error('Error renaming folder:', error)
      // You could add a toast notification here
    } finally {
      setRenaming(false)
    }
  }

  const handleDeleteFolder = (folder: Folder) => {
    setDeleteConfirm({ folder })
    setFolderMenuOpen(null)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.folder) return

    try {
      setDeleting(true)
      await folderService.deleteFolder(deleteConfirm.folder.id)
      
      // Remove the folder from the list
      const updatedFolders = folders.filter(f => f.id !== deleteConfirm.folder!.id)
      setFolders(updatedFolders)
      saveFoldersToCache(updatedFolders)
      
      // Clear cache for the deleted folder's materials
      if (typeof window !== 'undefined') {
        const folderId = deleteConfirm.folder.id
        localStorage.removeItem(`folder_summaries_${folderId}`)
        localStorage.removeItem(`folder_summaries_${folderId}_timestamp`)
        localStorage.removeItem(`folder_quizzes_${folderId}`)
        localStorage.removeItem(`folder_quizzes_${folderId}_timestamp`)
        localStorage.removeItem(`folder_flashcards_${folderId}`)
        localStorage.removeItem(`folder_flashcards_${folderId}_timestamp`)
      }
      
      setDeleteConfirm({ folder: null })
    } catch (error) {
      console.error('Error deleting folder:', error)
      // You could add a toast notification here
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ folder: null })
  }

  const loadStudyStreak = async () => {
    try {
      setStreakLoading(true)
      const streakData = await quizService.getStudyStreak()
      setStudyStreak(streakData)
    } catch (error) {
      console.error('Error loading study streak:', error)
      // Set defaults on error
      setStudyStreak({ current_streak: 0, longest_streak: 0, last_study_date: null })
    } finally {
      setStreakLoading(false)
    }
  }

  return (
    <DashboardLayout activeTab="home">
      <div className="p-6">
            {/* Dashboard Title with Study Streak */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              
              {/* Study Streak Card - Compact */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border-2 border-orange-200 px-6 py-2.5 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-orange-700"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 leading-tight">Study Streak</p>
                    {streakLoading ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-500">...</span>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-gray-900 leading-tight">
                        {studyStreak?.current_streak || 0} {studyStreak?.current_streak === 1 ? 'day' : 'days'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Notes Card */}
              <div 
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => router.push('/notes-generator')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center mb-4 group-hover:bg-cyan-600 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Notes</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    Upload your lecture notes, PDFs, or documents to get started.
                  </p>
                  <div className="flex items-center text-cyan-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    <span>Create Notes</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Quiz Card */}
              <div 
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => router.push('/quiz-generator')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-4 group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Practice Quiz</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    Create practice quizzes from your uploaded materials to test your knowledge.
                  </p>
                  <div className="flex items-center text-yellow-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    <span>Start Quiz</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Flashcards Card */}
              <div 
                className="group relative bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                onClick={() => router.push('/flashcard-generator')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Flashcards</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    Generate flashcards to memorize key concepts and terms efficiently.
                  </p>
                  <div className="flex items-center text-red-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    <span>Study Now</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
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
                  {foldersLoading && folders.length > 0 && (
                    <div className="ml-2 flex items-center">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
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
              {isInitialLoad && folders.length === 0 ? (
                // Skeleton loading for first-time visitors
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div 
                      key={i}
                      className="bg-white border-2 border-gray-200 rounded-lg p-6 animate-pulse"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                        <div className="h-4 bg-gray-300 rounded w-16"></div>
                      </div>
                      <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-3 bg-gray-300 rounded w-20"></div>
                        <div className="h-3 bg-gray-300 rounded w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No folders found. Create your first folder!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => router.push(`/folders/${folder.id}?name=${encodeURIComponent(folder.name)}`)}
                      className={`border-2 border-slate-200 rounded-lg p-6 hover:brightness-95 hover:shadow-sm transition-all text-left group relative ${
                        folderMenuOpen === folder.id ? 'z-[9999]' : ''
                      }`}
                      style={{ backgroundColor: folder.color }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-slate-800 font-bold text-lg bg-white overflow-hidden"
                        >
                          {folder.picture_url ? (
                            <img 
                              src={folder.picture_url} 
                              alt={folder.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            folder.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-800 group-hover:text-primary">
                              {folder.materials_count} items
                            </div>
                          </div>
                          
                          {/* Kebab Menu */}
                          <div className="relative z-40">
                            <button 
                              className="folder-menu-button p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
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
                              <div className="folder-menu absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-40">
                                <button 
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleSetPicture(folder)
                                  }}
                                >
                                  Set Picture
                                </button>
                                <button 
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRenameFolder(folder)
                                  }}
                                >
                                  Rename
                                </button>
                                <button 
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteFolder(folder)
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-primary transition-colors">
                        {folder.name}
                      </h3>
                      <div className="flex items-center text-xs text-slate-800 space-x-4">
                        <span>
                          {new Date(folder.updated_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          {folder.materials.files} files
                        </span>
                      </div>
                    </button>
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
            <div className="mb-6 space-y-4">
              <div>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        selectedColor === color
                          ? 'border-gray-800 scale-110 shadow-md'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
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

      {/* Rename Folder Modal */}
      {renameModalOpen && folderToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Rename Folder</h2>
              <button
                onClick={handleCloseRenameModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={renaming}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <label htmlFor="newFolderName" className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                id="newFolderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter folder name"
                autoFocus
                disabled={renaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !renaming && newFolderName.trim()) {
                    confirmRename()
                  } else if (e.key === 'Escape' && !renaming) {
                    handleCloseRenameModal()
                  }
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseRenameModal}
                disabled={renaming}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmRename}
                disabled={!newFolderName.trim() || renaming}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {renaming ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Picture Modal */}
      {pictureModalOpen && folderToUpdatePicture && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Set Folder Picture</h2>
              <button
                onClick={handleClosePictureModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={uploadingPicture}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="mb-6 space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                  {picturePreview ? (
                    <img 
                      src={picturePreview} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-2xl font-bold">
                      {folderToUpdatePicture.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* File Input */}
              <div>
                <label htmlFor="pictureFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Picture
                </label>
                <input
                  type="file"
                  id="pictureFile"
                  accept="image/*"
                  onChange={handlePictureFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={uploadingPicture}
                />
                <p className="mt-1 text-xs text-gray-500">Max size: 5MB. Supported formats: JPG, PNG, GIF</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3">
              {folderToUpdatePicture.picture_url && (
                <button
                  onClick={handleRemovePicture}
                  disabled={uploadingPicture}
                  className="px-4 py-2 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleClosePictureModal}
                disabled={uploadingPicture}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePicture}
                disabled={!pictureFile || uploadingPicture}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPicture ? 'Uploading...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {deleteConfirm.folder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Delete Folder?
              </h3>
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.folder.name}"</span>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Warning:</span> Deleting this folder will also delete all files and materials inside it, including:
                </p>
                <ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
                  <li>Uploaded files ({deleteConfirm.folder.materials.files || 0})</li>
                  <li>Generated summaries ({deleteConfirm.folder.materials.summaries || 0})</li>
                  <li>Generated quizzes ({deleteConfirm.folder.materials.quizzes || 0})</li>
                  <li>Generated flashcards ({deleteConfirm.folder.materials.flashcards || 0})</li>
                </ul>
                <p className="text-sm text-red-800 mt-3 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg font-medium transition-colors border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{backgroundColor: '#EF4444'}}
                onMouseEnter={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = '#DC2626'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleting) {
                    e.currentTarget.style.backgroundColor = '#EF4444'
                  }
                }}
              >
                {deleting ? 'Deleting...' : 'Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

