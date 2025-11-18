'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../lib/supabase'

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab?: 'home' | 'notes' | 'quiz' | 'flashcards' | 'analytics' | 'profile'
  sidebarBackground?: string
  contentBackground?: string
}

export default function DashboardLayout({ 
  children, 
  activeTab = 'home',
  sidebarBackground = 'bg-white',
  contentBackground = 'bg-white'
}: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState<string>('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
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
    const baseClasses = "flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors cursor-pointer group"
    const isActive = activeTab === tab
    
    if (isActive) {
      return `${baseClasses} bg-primary text-white`
    }
    
    return `${baseClasses} hover:bg-primary hover:text-white`
  }

  const getIconColor = (tab: string) => {
    const isActive = activeTab === tab
    if (isActive) return '#FFFFFF'
    
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

            {/* Profile Picture/Icon with Dropdown */}
            <div className="relative">
              <button 
                className="profile-button w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center hover:border-primary transition-colors overflow-hidden"
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
                <div className="profile-dropdown absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button 
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      router.push('/profile')
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
        <div className={`${sidebarBackground} border-r border-gray-200 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <div className="p-4">
            {/* Welcome Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                {!sidebarCollapsed && (
                  <span className="text-sm text-gray-900">
                    Welcome, {username || 'User'}
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
                className={getNavItemClasses('home')}
                onClick={() => router.push('/dashboard')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('home')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Home</span>}
              </div>

              {/* Notes */}
              <div 
                className={getNavItemClasses('notes')}
                onClick={() => router.push('/notes-generator')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('notes')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Notes</span>}
              </div>

              {/* Quiz */}
              <div className={getNavItemClasses('quiz')}>
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('quiz')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Quiz</span>}
              </div>

              {/* Flashcards */}
              <div 
                className={getNavItemClasses('flashcards')}
                onClick={() => router.push('/flashcard-generator')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('flashcards')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Flashcards</span>}
              </div>
            </nav>

            {/* Bottom Navigation */}
            <div className="mt-8 space-y-2">
              {/* Analytics */}
              <div 
                className={getNavItemClasses('analytics')}
                onClick={() => router.push('/analytics')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('analytics')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Analytic Tracking</span>}
              </div>

              {/* Profile */}
              <div 
                className={getNavItemClasses('profile')}
                onClick={() => router.push('/profile')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('profile')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Profile</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${contentBackground}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
