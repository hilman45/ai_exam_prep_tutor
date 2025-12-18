'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminService, DashboardStats } from '../../lib/adminService'
import AdminLayout from '../../components/AdminLayout'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAdminAndLoadStats = async () => {
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
        setError(null)
      } catch (err: any) {
        console.error('Error loading admin dashboard:', err)
        setError(err.message || 'Failed to load admin dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAndLoadStats()
  }, [])

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
      title: 'Total Quizzes Taken',
      value: stats?.total_quizzes_taken || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Total Flashcards Reviewed',
      value: stats?.total_flashcards_reviewed || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200'
    },
    {
      title: 'Total Notes Generated',
      value: stats?.total_notes_generated || 0,
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      borderColor: 'border-cyan-200'
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
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and usage statistics</p>
        </div>

        {/* Stats Cards Grid - Smaller cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg border-2 ${card.borderColor} p-4 transition-all duration-200 hover:scale-105 hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.bgColor} p-2 rounded-lg ${card.iconColor}`}>
                  <div className="w-6 h-6">
                    {card.icon}
                  </div>
                </div>
              </div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-800">{card.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

