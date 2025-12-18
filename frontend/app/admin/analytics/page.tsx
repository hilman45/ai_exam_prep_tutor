'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../../../components/AdminLayout'
import {
  adminService,
  TopicPerformance,
  TopicAttempts,
  FlashcardDifficulty,
  DailyActivity,
  User
} from '../../../lib/adminService'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AdminAnalyticsPage() {
  const [quizPerformance, setQuizPerformance] = useState<TopicPerformance[]>([])
  const [mostAttempted, setMostAttempted] = useState<TopicAttempts[]>([])
  const [flashcardDifficulty, setFlashcardDifficulty] = useState<FlashcardDifficulty | null>(null)
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Load users list
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await adminService.getUsers()
        setUsers(usersData)
        setFilteredUsers(usersData)
      } catch (err) {
        console.error('Error loading users:', err)
      }
    }

    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.full_name && user.full_name.toLowerCase().includes(query))
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  // Load analytics data
  const loadAnalytics = async (userId?: string) => {
    try {
      setLoading(true)
      // Load all analytics data in parallel
      const [performance, attempted, difficulty, activity] = await Promise.all([
        adminService.getQuizPerformanceByTopic(userId || undefined).catch(() => []),
        adminService.getMostAttemptedTopics(userId || undefined).catch(() => []),
        adminService.getFlashcardDifficulty(userId || undefined).catch(() => ({ again_count: 0, good_count: 0, easy_count: 0 })),
        adminService.getDailyStudyActivity(30, userId || undefined).catch(() => [])
      ])

      setQuizPerformance(performance)
      setMostAttempted(attempted)
      setFlashcardDifficulty(difficulty)
      setDailyActivity(activity)
      setError(null)
    } catch (err: any) {
      console.error('Error loading admin analytics:', err)
      setError(err.message || 'Failed to load admin analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAdminAndLoadAnalytics = async () => {
      try {
        // First check if user is admin
        const adminStatus = await adminService.checkIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
          return
        }

        // Load analytics for all users (no filter) - initial load
        // Don't reload if user is already selected (will be handled by the other useEffect)
        if (!selectedUserId) {
          await loadAnalytics()
        }
      } catch (err: any) {
        console.error('Error checking admin status:', err)
        setError(err.message || 'Failed to load admin analytics')
        setLoading(false)
      }
    }

    checkAdminAndLoadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload analytics when user selection changes
  useEffect(() => {
    if (isAdmin) {
      loadAnalytics(selectedUserId || undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, isAdmin])

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'Space Grotesk, sans-serif',
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Space Grotesk, sans-serif',
          },
        },
      },
      x: {
        ticks: {
          font: {
            family: 'Space Grotesk, sans-serif',
          },
        },
      },
    },
  }

  // Prepare Quiz Performance by Topic chart data
  const getQuizPerformanceData = () => {
    // Limit to top 10 topics for readability
    const topTopics = quizPerformance.slice(0, 10)
    
    return {
      labels: topTopics.map(t => t.topic_name.length > 20 ? t.topic_name.substring(0, 20) + '...' : t.topic_name),
      datasets: [
        {
          label: 'Average Score (%)',
          data: topTopics.map(t => t.average_score),
          backgroundColor: '#892CDC',
          borderColor: '#892CDC',
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare Most Attempted Topics chart data
  const getMostAttemptedData = () => {
    // Limit to top 10 topics for readability
    const topTopics = mostAttempted.slice(0, 10)
    
    return {
      labels: topTopics.map(t => t.topic_name.length > 20 ? t.topic_name.substring(0, 20) + '...' : t.topic_name),
      datasets: [
        {
          label: 'Number of Attempts',
          data: topTopics.map(t => t.attempt_count),
          backgroundColor: '#0f5bff',
          borderColor: '#0f5bff',
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare Flashcard Review Difficulty chart data
  const getFlashcardDifficultyData = () => {
    if (!flashcardDifficulty) {
      return {
        labels: ['Again', 'Good', 'Easy'],
        datasets: [
          {
            label: 'Cards Reviewed',
            data: [0, 0, 0],
            backgroundColor: ['#EF4444', '#FACC15', '#22C55E'],
            borderColor: ['#EF4444', '#FACC15', '#22C55E'],
            borderWidth: 2,
          },
        ],
      }
    }

    return {
      labels: ['Again', 'Good', 'Easy'],
      datasets: [
        {
          label: 'Cards Reviewed',
          data: [
            flashcardDifficulty.again_count,
            flashcardDifficulty.good_count,
            flashcardDifficulty.easy_count,
          ],
          backgroundColor: ['#EF4444', '#FACC15', '#22C55E'],
          borderColor: ['#EF4444', '#FACC15', '#22C55E'],
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare Daily Study Activity chart data
  const getDailyActivityData = () => {
    // Limit to last 30 days for readability
    const recentActivity = dailyActivity.slice(-30)
    
    return {
      labels: recentActivity.map(a => {
        const date = new Date(a.date)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          label: 'Quiz Actions',
          data: recentActivity.map(a => a.quiz_count),
          borderColor: '#892CDC',
          backgroundColor: 'rgba(137, 44, 220, 0.1)',
          borderWidth: 2,
          tension: 0.4,
        },
        {
          label: 'Flashcard Actions',
          data: recentActivity.map(a => a.flashcard_count),
          borderColor: '#0f5bff',
          backgroundColor: 'rgba(15, 91, 255, 0.1)',
          borderWidth: 2,
          tension: 0.4,
        },
        {
          label: 'Total Actions',
          data: recentActivity.map(a => a.total_actions),
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    }
  }

  if (loading) {
    return (
      <AdminLayout activeTab="analytics">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin analytics...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !isAdmin) {
    return (
      <AdminLayout activeTab="analytics">
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

  const selectedUser = selectedUserId ? users.find(u => u.user_id === selectedUserId) : null

  return (
    <AdminLayout activeTab="analytics">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Admin Analytics</h1>
          <p className="text-gray-600">Study behavior insights and usage trends</p>
        </div>

        {/* User Search and Filter */}
        <div className="mb-6 bg-white rounded-lg border-2 border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:w-auto relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by User
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && filteredUsers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => {
                        setSelectedUserId(user.user_id)
                        setSearchQuery('')
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-primary hover:text-white transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.full_name && (
                        <div className="text-xs text-gray-500">{user.full_name}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && filteredUsers.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
                  No users found
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <div className="px-4 py-2 bg-primary bg-opacity-10 border-2 border-primary rounded-lg">
                  <span className="text-sm font-medium text-primary">
                    Viewing: {selectedUser.username} ({selectedUser.email})
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm font-medium"
                >
                  Clear Filter
                </button>
              </div>
            )}
            {!selectedUser && (
              <div className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-lg">
                <span className="text-sm font-medium text-gray-600">
                  Showing: All Users
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quiz Performance by Topic */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quiz Performance by Topic</h2>
            {quizPerformance.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No quiz performance data available</p>
              </div>
            ) : (
              <div className="h-64">
                <Bar data={getQuizPerformanceData()} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Most Attempted Quiz Topics */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Most Attempted Quiz Topics</h2>
            {mostAttempted.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No quiz attempt data available</p>
              </div>
            ) : (
              <div className="h-64">
                <Bar data={getMostAttemptedData()} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Flashcards Review Difficulty */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Flashcards Review Difficulty</h2>
            {flashcardDifficulty && 
             flashcardDifficulty.again_count === 0 && 
             flashcardDifficulty.good_count === 0 && 
             flashcardDifficulty.easy_count === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No flashcard review data available</p>
              </div>
            ) : (
              <div className="h-64">
                <Pie data={getFlashcardDifficultyData()} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        font: {
                          family: 'Space Grotesk, sans-serif',
                        },
                      },
                    },
                  },
                }} />
              </div>
            )}
          </div>

          {/* Daily Study Activity */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Study Activity</h2>
            {dailyActivity.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <p>No daily activity data available</p>
              </div>
            ) : (
              <div className="h-64">
                <Line data={getDailyActivityData()} options={chartOptions} />
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

