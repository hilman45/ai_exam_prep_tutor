'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '../../../components/AdminLayout'
import {
  adminService,
  UserGrowthPoint,
  FeatureUsage,
  ContentActivityPoint,
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
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface StatCard {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: string
}

function StatCardComponent({ label, value, icon, accent }: StatCard) {
  return (
    <div className={`bg-white rounded-lg border-2 ${accent} p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent.replace('border-', 'bg-').replace('-400', '-100').replace('-500', '-100')}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { font: { family: 'Space Grotesk, sans-serif' } },
    },
    title: { display: false },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { font: { family: 'Space Grotesk, sans-serif' } },
    },
    x: {
      ticks: { font: { family: 'Space Grotesk, sans-serif' } },
    },
  },
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function AdminAnalyticsPage() {
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([])
  const [featureUsage, setFeatureUsage] = useState<FeatureUsage | null>(null)
  const [contentActivity, setContentActivity] = useState<ContentActivityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const adminStatus = await adminService.checkIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
          return
        }

        const [growth, usage, activity] = await Promise.all([
          adminService.getUserGrowth(30).catch(() => [] as UserGrowthPoint[]),
          adminService.getFeatureUsage().catch(() => null),
          adminService.getContentActivity(30).catch(() => [] as ContentActivityPoint[]),
        ])

        setUserGrowth(growth)
        setFeatureUsage(usage)
        setContentActivity(activity)
      } catch (err: any) {
        console.error('Error loading admin analytics:', err)
        setError(err.message || 'Failed to load admin analytics')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  if (loading) {
    return (
      <AdminLayout activeTab="analytics">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading analytics...</p>
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
            <p className="text-gray-600 mb-6">{error || 'Admin privileges required.'}</p>
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

  // --- Stat cards ---
  const totalContent = featureUsage
    ? featureUsage.summaries + featureUsage.quizzes + featureUsage.flashcards
    : 0

  const statCards: StatCard[] = [
    {
      label: 'Total Files Uploaded',
      value: featureUsage?.files ?? 0,
      accent: 'border-blue-400',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
    {
      label: 'Total Content Generated',
      value: totalContent,
      accent: 'border-purple-400',
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Pending Feedback',
      value: featureUsage?.pending_feedback ?? 0,
      accent: 'border-orange-400',
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      label: 'New Users This Week',
      value: featureUsage?.new_users_this_week ?? 0,
      accent: 'border-green-400',
      icon: (
        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
    },
  ]

  // --- Chart data ---
  const userGrowthData = {
    labels: userGrowth.map(p => formatDate(p.date)),
    datasets: [
      {
        label: 'New Registrations',
        data: userGrowth.map(p => p.count),
        borderColor: '#892CDC',
        backgroundColor: 'rgba(137, 44, 220, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
      },
    ],
  }

  const featureUsageData = {
    labels: ['Files', 'Summaries', 'Quizzes', 'Flashcard Sets'],
    datasets: [
      {
        label: 'Total Count',
        data: featureUsage
          ? [featureUsage.files, featureUsage.summaries, featureUsage.quizzes, featureUsage.flashcards]
          : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(15, 91, 255, 0.75)',
          'rgba(137, 44, 220, 0.75)',
          'rgba(34, 197, 94, 0.75)',
          'rgba(249, 115, 22, 0.75)',
        ],
        borderColor: ['#0f5bff', '#892CDC', '#22C55E', '#F97316'],
        borderWidth: 2,
      },
    ],
  }

  const contentActivityData = {
    labels: contentActivity.map(p => formatDate(p.date)),
    datasets: [
      {
        label: 'Quizzes',
        data: contentActivity.map(p => p.quiz_count),
        borderColor: '#892CDC',
        backgroundColor: 'rgba(137, 44, 220, 0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Flashcard Sets',
        data: contentActivity.map(p => p.flashcard_count),
        borderColor: '#0f5bff',
        backgroundColor: 'rgba(15, 91, 255, 0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Summaries',
        data: contentActivity.map(p => p.summary_count),
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
    ],
  }

  const horizontalBarOptions = {
    ...baseChartOptions,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        ticks: { font: { family: 'Space Grotesk, sans-serif' } },
      },
      y: {
        ticks: { font: { family: 'Space Grotesk, sans-serif' } },
      },
    },
  }

  const isEmptyGrowth = userGrowth.every(p => p.count === 0)
  const isEmptyActivity = contentActivity.every(p => p.total === 0)

  return (
    <AdminLayout activeTab="analytics">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Platform Analytics</h1>
          <p className="text-gray-500 text-sm">Platform-level insights — growth, content, and feature adoption</p>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map(card => (
            <StatCardComponent key={card.label} {...card} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: User Registration Growth */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">User Registration Growth</h2>
            <p className="text-xs text-gray-400 mb-4">New sign-ups per day — last 30 days</p>
            {isEmptyGrowth ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No registration data yet
              </div>
            ) : (
              <div className="h-64">
                <Line data={userGrowthData} options={baseChartOptions} />
              </div>
            )}
          </div>

          {/* Chart 2: Feature Adoption */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Feature Adoption</h2>
            <p className="text-xs text-gray-400 mb-4">Platform-wide total records per feature</p>
            {!featureUsage ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No feature data yet
              </div>
            ) : (
              <div className="h-64">
                <Bar data={featureUsageData} options={horizontalBarOptions} />
              </div>
            )}
          </div>
        </div>

        {/* Chart 3: Daily Content Creation — full width */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Daily Content Creation Activity</h2>
          <p className="text-xs text-gray-400 mb-4">Quizzes, flashcard sets, and summaries created per day — last 30 days</p>
          {isEmptyActivity ? (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
              No content creation data yet
            </div>
          ) : (
            <div className="h-72">
              <Line data={contentActivityData} options={baseChartOptions} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
