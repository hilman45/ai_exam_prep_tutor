'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { folderService, Folder } from '../../lib/folderService'
import DashboardLayout from '../../components/DashboardLayout'

export default function MyFoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
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

  const loadFolders = async () => {
    try {
      setLoading(true)
      const userFolders = await folderService.getFolders()
      // Sort by updated_at descending (most recently updated first)
      const sorted = userFolders.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      setFolders(sorted)
      setFilteredFolders(sorted)
    } catch (error) {
      console.error('Error loading folders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folderId: string) => {
    router.push(`/folders/${folderId}`)
  }

  return (
    <DashboardLayout activeTab="home" sidebarBackground="bg-white" contentBackground="bg-white">
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark mb-2">My Folders</h1>
            <p className="text-gray-600">Manage and organize your study materials</p>
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
                  className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: folder.color }}
                    >
                      {folder.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 group-hover:text-primary">
                        {folder.materials_count} items
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-dark mb-2 group-hover:text-primary transition-colors">
                    {folder.name}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
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
    </DashboardLayout>
  )
}

