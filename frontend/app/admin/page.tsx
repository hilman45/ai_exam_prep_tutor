'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminService, DashboardStats } from '../../lib/adminService'
import AdminLayout from '../../components/AdminLayout'
import { supabase } from '../../lib/supabase'

interface RecentUser {
  user_id: string
  username: string
  email: string
  full_name: string | null
  last_login?: string
  created_at: string
}

interface RecentFeedback {
  id: string
  username: string
  full_name: string
  feedback_text: string
  category: string
  rating: string | null
  status: string
  created_at: string
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      try {
        // First check if user is admin
        const adminStatus = await adminService.checkIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
          return
        }

        // Load dashboard stats
        const dashboardStats = await adminService.getDashboardStats()
        setStats(dashboardStats)

        // Load recent users (last 10)
        await loadRecentUsers()

        // Load recent feedback (last 5)
        await loadRecentFeedback()

        setError(null)
      } catch (err: any) {
        console.error('Error loading admin dashboard:', err)
        setError(err.message || 'Failed to load admin dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAndLoadData()
  }, [])

  const loadRecentUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get recent users from admin endpoint (ordered by created_at desc)
      const response = await fetch(
        `http://localhost:8000/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const users = await response.json()
        // Sort by created_at descending and take first 10
        const sortedUsers = users
          .sort((a: RecentUser, b: RecentUser) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10)
        setRecentUsers(sortedUsers)
      }
    } catch (err) {
      console.error('Error loading recent users:', err)
    }
  }

  const loadRecentFeedback = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Get recent feedback (ordered by created_at desc)
      const response = await fetch(
        `http://localhost:8000/feedback/admin/all`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const feedback = await response.json()
        // Take first 5 feedback items (already sorted by created_at desc from backend)
        setRecentFeedback(feedback.slice(0, 5))
      }
    } catch (err) {
      console.error('Error loading recent feedback:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      bugs: '🐛 Bugs',
      feature_request: '💡 Feature Request',
      uploading_files: '📤 Uploading Files',
      notes_ai: '📝 Notes AI',
      flashcards_ai: '🃏 Flashcards AI',
      quizfetch: '🎯 QuizFetch'
    }
    return labels[category] || category
  }

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { label: string; color: string } } = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' }
    }
    const badge = badges[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200' }
    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout activeTab="dashboard">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !isAdmin) {
    return (
      <AdminLayout activeTab="dashboard">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg border-2 border-red-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error || 'Admin privileges required to access this page.'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.total_users || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Total AI Chat Interactions',
      value: stats?.total_ai_chat_interactions || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Daily Active Users',
      value: stats?.daily_active_users || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    }
  ]

  return (
    <AdminLayout activeTab="dashboard">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">System overview and quick insights</p>
          </div>

          {/* Stats Cards Grid - Only 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((card, index) => (
              <div
                key={index}
                className={`bg-white rounded-xl border-2 ${card.borderColor} p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.bgColor} p-3 rounded-xl ${card.iconColor}`}>
                    {card.icon}
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">{card.title}</h3>
                <p className="text-3xl font-bold text-gray-800">{card.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark">Recent Users</h2>
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="text-sm text-primary hover:text-purple-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      recentUsers.map((user) => (
                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-semibold">
                                {(user.full_name || user.username || user.email || 'U')[0].toUpperCase()}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name || user.username || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500">@{user.username || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Feedback Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark">Recent Feedback</h2>
                  <button
                    onClick={() => router.push('/admin/feedback')}
                    className="text-sm text-primary hover:text-purple-700 font-medium"
                  >
                    View All →
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentFeedback.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          No feedback found
                        </td>
                      </tr>
                    ) : (
                      recentFeedback.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {feedback.full_name || feedback.username || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {feedback.feedback_text.substring(0, 50)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {getCategoryLabel(feedback.category)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(feedback.status)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
