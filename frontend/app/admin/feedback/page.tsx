'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '../../../components/AdminLayout'
import { supabase } from '../../../lib/supabase'

interface Feedback {
  id: string
  user_id: string
  username: string
  full_name: string
  feedback_text: string
  category: string
  rating: string | null
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
}

const categoryLabels: { [key: string]: { label: string; color: string; icon: string } } = {
  bugs: { label: 'Bugs', color: 'bg-red-100 text-red-800 border-red-200', icon: '🐛' },
  feature_request: { label: 'Feature Request', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '💡' },
  uploading_files: { label: 'Uploading Files', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '📤' },
  notes_ai: { label: 'Notes AI', color: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: '📝' },
  flashcards_ai: { label: 'Flashcards AI', color: 'bg-green-100 text-green-800 border-green-200', icon: '🃏' },
  quizfetch: { label: 'QuizFetch', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🎯' }
}

const statusLabels: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  reviewed: { label: 'Reviewed', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' }
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [stats, setStats] = useState<any>(null)

  // Form states for modal
  const [newStatus, setNewStatus] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')

  const fetchFeedback = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Build query params
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status_filter', statusFilter)
      if (categoryFilter !== 'all') params.append('category_filter', categoryFilter)

      const response = await fetch(
        `http://localhost:8000/feedback/admin/all?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch feedback')
      }

      const data = await response.json()
      setFeedbacks(data)
    } catch (err) {
      console.error('Error fetching feedback:', err)
      setError('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('http://localhost:8000/feedback/admin/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  useEffect(() => {
    fetchFeedback()
    fetchStats()
  }, [statusFilter, categoryFilter])

  const handleOpenModal = (feedback: Feedback) => {
    setSelectedFeedback(feedback)
    setNewStatus(feedback.status)
    setAdminNotes(feedback.admin_notes || '')
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedFeedback(null)
    setNewStatus('')
    setAdminNotes('')
  }

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return

    try {
      setUpdating(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Not authenticated')
        return
      }

      const response = await fetch(
        `http://localhost:8000/feedback/admin/${selectedFeedback.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            status: newStatus,
            admin_notes: adminNotes.trim() || null
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update feedback')
      }

      // Refresh feedback list
      await fetchFeedback()
      await fetchStats()
      handleCloseModal()
    } catch (err) {
      console.error('Error updating feedback:', err)
      alert('Failed to update feedback')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AdminLayout activeTab="feedback">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark mb-2">User Feedback</h1>
            <p className="text-gray-600">Manage and respond to user feedback</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Total Feedback</p>
                <p className="text-3xl font-bold text-primary">{stats.total_feedback}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.by_status?.pending || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Reviewed</p>
                <p className="text-3xl font-bold text-blue-600">{stats.by_status?.reviewed || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats.by_status?.resolved || 0}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Categories</option>
                {Object.keys(categoryLabels).map((key) => (
                  <option key={key} value={key}>
                    {categoryLabels[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setCategoryFilter('all')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-primary border border-gray-300 hover:border-primary rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Feedback List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading feedback...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-600">No feedback found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {feedback.full_name} (@{feedback.username})
                        </h3>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${statusLabels[feedback.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {statusLabels[feedback.status]?.label || feedback.status}
                        </span>
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${categoryLabels[feedback.category]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {categoryLabels[feedback.category]?.icon} {categoryLabels[feedback.category]?.label || feedback.category}
                        </span>
                        {feedback.rating && (
                          <span className="text-lg">
                            {feedback.rating === 'good' ? '👍' : '👎'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{formatDate(feedback.created_at)}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{feedback.feedback_text}</p>
                      {feedback.admin_notes && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs font-semibold text-blue-800 mb-1">Admin Notes:</p>
                          <p className="text-sm text-blue-700">{feedback.admin_notes}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenModal(feedback)}
                      className="ml-4 px-4 py-2 bg-primary hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Update Modal */}
        {modalOpen && selectedFeedback && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-dark">Update Feedback</h2>
                <button
                  onClick={handleCloseModal}
                  disabled={updating}
                  className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Feedback Details */}
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    From: {selectedFeedback.full_name} (@{selectedFeedback.username})
                  </p>
                  <p className="text-sm text-gray-600 mb-3">{formatDate(selectedFeedback.created_at)}</p>
                  <p className="text-gray-800">{selectedFeedback.feedback_text}</p>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={updating}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    disabled={updating}
                    placeholder="Add internal notes about this feedback..."
                    className="w-full min-h-[120px] p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    disabled={updating}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateFeedback}
                    disabled={updating}
                    className="flex-1 px-4 py-3 bg-primary hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Feedback</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

