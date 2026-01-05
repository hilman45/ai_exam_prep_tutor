'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../lib/supabase'
import { folderService, Folder } from '../lib/folderService'
import FeedbackModal from './FeedbackModal'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab?: 'home' | 'notes' | 'quiz' | 'flashcards' | 'analytics' | 'profile'
  sidebarBackground?: string
  contentBackground?: string
}

export default function DashboardLayout({ 
  children, 
  activeTab = 'home',
  sidebarBackground = 'bg-gray-50/50',
  contentBackground = 'bg-white'
}: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string>('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [myFolderOpen, setMyFolderOpen] = useState(true)
  const [recentFolders, setRecentFolders] = useState<Folder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const router = useRouter()

  const loadProfileData = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('username, full_name, profile_picture_url')
        .eq('user_id', userId)
        .single()
      
      if (profileError) {
        console.error('Error fetching profile:', profileError)
        setUsername('User') // Fallback
      } else {
        setUsername(profile.username)
        setFullName(profile.full_name)
        setProfilePicture(profile.profile_picture_url)
      }
    } catch (profileError) {
      console.error('Error fetching profile:', profileError)
      setUsername('User') // Fallback
    }
  }

  // Load recent folders from localStorage
  const loadRecentFoldersFromStorage = (): string[] => {
    if (typeof window === 'undefined') return []
    try {
      const recent = localStorage.getItem('recent_folders')
      if (recent) {
        const folders = JSON.parse(recent)
        return folders.map((f: Folder) => f.id)
      }
    } catch (error) {
      console.error('Error loading recent folders:', error)
    }
    return []
  }

  // Load recent folders
  const fetchRecentFolders = async () => {
    if (!user) return
    try {
      setFoldersLoading(true)
      const allFolders = await folderService.getFolders()
      const recentIds = loadRecentFoldersFromStorage()
      
      if (recentIds.length === 0) {
        // If no recent folders, show first 3 folders
        setRecentFolders(allFolders.slice(0, 3))
      } else {
        // Filter and sort by recent order
        const recent = allFolders
          .filter(f => recentIds.includes(f.id))
          .sort((a, b) => {
            const aIndex = recentIds.indexOf(a.id)
            const bIndex = recentIds.indexOf(b.id)
            return aIndex - bIndex
          })
          .slice(0, 3)
        setRecentFolders(recent)
      }
    } catch (error) {
      console.error('Error fetching recent folders:', error)
      setRecentFolders([])
    } finally {
      setFoldersLoading(false)
    }
  }

  useEffect(() => {
    // Check if user is authenticated and fetch username
    const checkUser = async () => {
      try {
        const { user, error } = await authHelpers.getCurrentUser()
        
        if (error || !user) {
          // User not authenticated, redirect to login
          router.push('/login')
          return
        }

        setUser(user)
        await loadProfileData(user.id)
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
          await loadProfileData(session.user.id)
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Refresh profile data when component becomes visible (e.g., after returning from profile page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadProfileData(user.id)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Load recent folders when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchRecentFolders()
    }
  }, [user, loading])

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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getNavItemClasses = (tab: string) => {
    const isActive = activeTab === tab
    return `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group mb-1 ${
      isActive 
        ? 'bg-primary text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
    }`
  }

  const getIconColor = (tab: string) => {
    if (activeTab === tab) return 'currentColor' // White when active
    
    // Default colors when inactive
    const colors = {
      home: '#7C3AED',
      notes: '#06B6D4',
      quiz: '#FACC15',
      flashcards: '#EF4444',
      analytics: '#22C55E',
      profile: '#F472B6'
    }
    
    return colors[tab as keyof typeof colors] || '#7C3AED'
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name[0].toUpperCase()
    }
    return email[0].toUpperCase()
  }

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
      <header className="bg-white/80 backdrop-blur-md fixed top-0 left-64 right-0 z-20 h-16">
        <nav className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-16 gap-3">
            {/* Feedback Button */}
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-primary border border-gray-200 hover:border-primary rounded-xl transition-all hover:shadow-sm bg-white"
              title="Submit Feedback"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="hidden sm:inline font-medium">Feedback</span>
            </button>

            {/* Profile Picture/Icon with Dropdown */}
            <div className="relative">
              <button 
                className="profile-button w-10 h-10 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-primary transition-all overflow-hidden shadow-sm"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                    {user ? getInitials(fullName, user.email || '') : 'U'}
                  </div>
                )}
              </button>
              
              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="profile-dropdown absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-gray-100 mb-1">
                    <p className="text-sm font-bold text-gray-900 truncate">{fullName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-2"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      router.push('/profile')
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    My Profile
                  </button>
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      handleSignOut()
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Layout */}
      <div className="flex min-h-screen pt-16">
        {/* Sidebar */}
        <div className={`${sidebarBackground} border-r border-gray-200 flex flex-col w-64 fixed top-0 bottom-0 z-30 pt-4`}>
          <div className="px-6 pb-6 flex flex-col h-full">
            {/* Logo */}
            <div className="mb-8 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">P</div>
              <h1 className="text-2xl font-bold text-dark">
                <span className="text-black">Prep</span>
                <span className="text-primary">Wise</span>
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="space-y-1">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Menu
              </div>
              
              {/* Home */}
              <div 
                className={getNavItemClasses('home')}
                onClick={() => router.push('/dashboard')}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'home' ? 'text-white' : ''}`} style={{color: activeTab !== 'home' ? getIconColor('home') : undefined}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-medium text-sm">Dashboard</span>
              </div>

              {/* Notes */}
              <div 
                className={getNavItemClasses('notes')}
                onClick={() => router.push('/notes-generator')}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'notes' ? 'text-white' : ''}`} style={{color: activeTab !== 'notes' ? getIconColor('notes') : undefined}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-sm">Notes</span>
              </div>

              {/* Quiz */}
              <div 
                className={getNavItemClasses('quiz')}
                onClick={() => router.push('/quiz-generator')}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'quiz' ? 'text-white' : ''}`} style={{color: activeTab !== 'quiz' ? getIconColor('quiz') : undefined}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-medium text-sm">Quiz</span>
              </div>

              {/* Flashcards */}
              <div 
                className={getNavItemClasses('flashcards')}
                onClick={() => router.push('/flashcard-generator')}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'flashcards' ? 'text-white' : ''}`} style={{color: activeTab !== 'flashcards' ? getIconColor('flashcards') : undefined}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-medium text-sm">Flashcards</span>
              </div>

              {/* Analytics */}
              <div 
                className={getNavItemClasses('analytics')}
                onClick={() => router.push('/analytics')}
              >
                <svg className={`w-5 h-5 transition-colors ${activeTab === 'analytics' ? 'text-white' : ''}`} style={{color: activeTab !== 'analytics' ? getIconColor('analytics') : undefined}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-medium text-sm">Analytics</span>
              </div>

              <div className="pt-4 px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Library
              </div>

              {/* My Folder Section */}
              <div className="mb-2">
                <button
                  onClick={() => setMyFolderOpen(!myFolderOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="font-medium">My Folders</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${myFolderOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {myFolderOpen && (
                  <div className="ml-10 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
                    {foldersLoading ? (
                      <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>
                    ) : recentFolders.length > 0 ? (
                      recentFolders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            router.push(`/folders/${folder.id}`)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-dark hover:bg-gray-100 rounded-md transition-colors flex items-center gap-2 truncate"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-400">No recent folders</div>
                    )}
                    <button
                      onClick={() => router.push('/my-folders')}
                      className="w-full text-left px-3 py-2 text-xs text-primary hover:text-purple-700 font-medium transition-colors mt-1"
                    >
                      + View All Folders
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Documentation Button at Bottom */}
            <div className="mt-auto pt-6 border-t border-gray-200">
                <button
                    onClick={() => router.push('/docs')}
                    className="w-full flex items-center space-x-3 px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-dark rounded-lg transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium text-sm">Documentation</span>
                </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${contentBackground} ml-64`}>
          {children}
        </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
      />
    </div>
  )
}
