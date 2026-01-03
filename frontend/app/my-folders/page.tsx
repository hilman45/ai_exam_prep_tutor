'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { folderService, Folder } from '../../lib/folderService'
import { supabase, authHelpers } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'

// Folder color palette
const FOLDER_COLORS = [
  '#E9D5FF', // Light Lavender
  '#BAE6FD', // Sky Blue
  '#BBF7D0', // Mint Green
  '#FEF9C3', // Soft Yellow
  '#FBCFE8', // Blush Pink
  '#FED7AA', // Pale Orange
]

const FOLDERS_CACHE_KEY = 'my_folders_cache'
const FOLDERS_CACHE_TIMESTAMP_KEY = 'my_folders_cache_timestamp'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function MyFoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(FOLDER_COLORS[0])
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
    
    loadFolders()
  }, [])

  useEffect(() => {
    // Filter folders based on search query
    if (searchQuery.trim() === '') {
      setFilteredFolders(folders)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = folders.filter(folder =>
        folder.name.toLowerCase().includes(query)
      )
      setFilteredFolders(filtered)
    }
  }, [searchQuery, folders])

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
      const sorted = cachedFolders.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setFolders(sorted)
      setFilteredFolders(sorted)
      setLoading(false)
    }
    
    // Then fetch fresh data in the background
    try {
      if (!cachedFolders) setLoading(true)
      const userFolders = await folderService.getFolders()
      // Sort by updated_at descending (most recently updated first)
      const sorted = userFolders.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setFolders(sorted)
      setFilteredFolders(sorted)
      saveFoldersToCache(sorted)
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folderId: string) => {
    router.push(`/folders/${folderId}`)
  }

  const handleAddFolder = async () => {
    if (folderName.trim()) {
      try {
        const newFolder = await folderService.createFolder({
          name: folderName.trim(),
          color: selectedColor
        })
        const sorted = [...folders, newFolder].sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        setFolders(sorted)
        setFilteredFolders(sorted)
        saveFoldersToCache(sorted)
        setFolderName('')
        setSelectedColor(FOLDER_COLORS[0])
        setAddFolderModalOpen(false)
      } catch (error) {
        console.error('Error creating folder:', error)
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
      
      const updatedFolders = folders.map(f => 
        f.id === folderToRename.id ? { ...f, name: updatedFolder.name } : f
      )
      const sorted = updatedFolders.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setFolders(sorted)
      setFilteredFolders(sorted)
      saveFoldersToCache(sorted)
      
      handleCloseRenameModal()
    } catch (error) {
      console.error('Error renaming folder:', error)
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
      
      const updatedFolders = folders.filter(f => f.id !== deleteConfirm.folder!.id)
      setFolders(updatedFolders)
      setFilteredFolders(updatedFolders)
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
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ folder: null })
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
        const sorted = updatedFolders.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        setFolders(sorted)
        setFilteredFolders(sorted)
        saveFoldersToCache(sorted)
        
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
      const sorted = updatedFolders.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setFolders(sorted)
      setFilteredFolders(sorted)
      saveFoldersToCache(sorted)
      
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

  return (
    <DashboardLayout activeTab="home" sidebarBackground="bg-white" contentBackground="bg-white">
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark mb-2">My Folders</h1>
              <p className="text-gray-600">Manage and organize your study materials</p>
            </div>
            <button 
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors"
              onClick={() => setAddFolderModalOpen(true)}
            >
              Add Folder
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 pr-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Folders Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading folders...</p>
              </div>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <p className="text-gray-600 text-lg">
                {searchQuery ? 'No folders found matching your search.' : 'No folders yet. Create your first folder from the dashboard!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
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

          {/* Results Count */}
          {!loading && folders.length > 0 && (
            <div className="mt-6 text-sm text-gray-600">
              {searchQuery ? (
                <span>
                  Showing {filteredFolders.length} of {folders.length} folder{folders.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <span>
                  {folders.length} folder{folders.length !== 1 ? 's' : ''} total
                </span>
              )}
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

