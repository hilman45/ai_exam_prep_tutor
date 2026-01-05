'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../lib/supabase'

interface AdminLayoutProps {
  children: React.ReactNode
  activeTab?: 'dashboard' | 'users' | 'analytics' | 'feedback'
  sidebarBackground?: string
  contentBackground?: string
}

export default function AdminLayout({ 
  children, 
  activeTab = 'dashboard',
  sidebarBackground = 'bg-white',
  contentBackground = 'bg-white'
}: AdminLayoutProps) {
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
        setUsername('Admin')
      } else {
        setUsername(profile.username)
        setFullName(profile.full_name)
        setProfilePicture(profile.profile_picture_url)
      }
    } catch (profileError) {
      console.error('Error fetching profile:', profileError)
      setUsername('Admin')
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { user, error } = await authHelpers.getCurrentUser()
        
        if (error || !user) {
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
      dashboard: '#892CDC',
      users: '#0f5bff',
      analytics: '#22C55E',
      feedback: '#F472B6'
    }
    
    return colors[tab as keyof typeof colors] || '#892CDC'
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
                <span className="text-sm text-gray-500 ml-2">Admin</span>
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
                    {user ? getInitials(fullName, user.email || '') : 'A'}
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
                      router.push('/dashboard')
                    }}
                  >
                    User Dashboard
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
                    Admin, {username || 'User'}
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
              {/* Dashboard */}
              <div 
                className={getNavItemClasses('dashboard')}
                onClick={() => router.push('/admin')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('dashboard')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Dashboard</span>}
              </div>

              {/* User Management */}
              <div 
                className={getNavItemClasses('users')}
                onClick={() => router.push('/admin/users')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('users')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">User Management</span>}
              </div>

              {/* Analytics */}
              <div 
                className={getNavItemClasses('analytics')}
                onClick={() => router.push('/admin/analytics')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('analytics')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Analytics</span>}
              </div>

              {/* Feedback */}
              <div 
                className={getNavItemClasses('feedback')}
                onClick={() => router.push('/admin/feedback')}
              >
                <svg className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} group-hover:text-white`} style={{color: getIconColor('feedback')}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                {!sidebarCollapsed && <span className="text-sm text-gray-600 group-hover:text-white">Feedback</span>}
              </div>
            </nav>
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

