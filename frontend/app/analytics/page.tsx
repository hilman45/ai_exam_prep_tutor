'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '../../components/DashboardLayout'
import { quizService, QuizDailyAnalytics, QuizWithAnalytics } from '../../lib/quizService'
import { flashcardService, FlashcardDailyAnalytics, FlashcardSetWithAnalytics } from '../../lib/flashcardService'
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
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

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
  ArcElement,
  Filler
)

interface StudyStreak {
  current_streak: number
  longest_streak: number
  last_study_date: string | null
}

export default function AnalyticsPage() {
  const [quizAnalytics, setQuizAnalytics] = useState<QuizDailyAnalytics | null>(null)
  const [flashcardAnalytics, setFlashcardAnalytics] = useState<FlashcardDailyAnalytics | null>(null)
  const [weakestQuizzes, setWeakestQuizzes] = useState<QuizWithAnalytics[]>([])
  const [weakestFlashcards, setWeakestFlashcards] = useState<FlashcardSetWithAnalytics[]>([])
  const [studyStreak, setStudyStreak] = useState<StudyStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcard'>('quiz')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch daily analytics, weakest items, and streak in parallel
      const [quizData, flashcardData, allQuizzes, allFlashcards, streakData] = await Promise.all([
        quizService.getDailyAnalytics(),
        flashcardService.getDailyAnalytics(),
        quizService.getAllQuizzesWithAnalytics().catch(() => []),
        flashcardService.getAllFlashcardSetsWithAnalytics().catch(() => []),
        quizService.getStudyStreak().catch(() => ({ current_streak: 0, longest_streak: 0, last_study_date: null })),
      ])

      setQuizAnalytics(quizData)
      setFlashcardAnalytics(flashcardData)
      setStudyStreak(streakData)
      
      // Get top 3 weakest quizzes (lowest accuracy)
      setWeakestQuizzes(allQuizzes.slice(0, 3))
      
      // Get top 3 weakest flashcards (highest again rate)
      setWeakestFlashcards(allFlashcards.slice(0, 3))
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Format time in seconds to readable format
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  // Prepare quiz performance chart data
  const getQuizPerformanceData = () => {
    const labels = ['Today']
    const correctData = [quizAnalytics?.total_correct || 0]
    const attemptedData = [quizAnalytics?.total_attempted || 0]

    return {
      labels,
      datasets: [
        {
          label: 'Correct Answers',
          data: correctData,
          backgroundColor: '#8B5CF6', // Violet-500
          borderRadius: 6,
        },
        {
          label: 'Total Attempted',
          data: attemptedData,
          backgroundColor: '#E5E7EB', // Gray-200
          borderRadius: 6,
        },
      ],
    }
  }

  // Prepare flashcard rating chart data
  const getFlashcardRatingData = () => {
    if (!flashcardAnalytics) {
      return {
        labels: ['Again', 'Good', 'Easy'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: ['#EF4444', '#F59E0B', '#10B981'],
          borderWidth: 0,
        }],
      }
    }

    return {
      labels: ['Again', 'Good', 'Easy'],
      datasets: [{
        data: [
          flashcardAnalytics.again_count,
          flashcardAnalytics.good_count,
          flashcardAnalytics.easy_count,
        ],
        backgroundColor: ['#EF4444', '#F59E0B', '#10B981'], // Red, Amber, Emerald
        borderWidth: 0,
      }],
    }
  }

  // Prepare flashcard daily review chart data
  const getFlashcardDailyData = () => {
    const labels = ['Today']
    const reviewedData = [flashcardAnalytics?.total_reviewed || 0]

    return {
      labels,
      datasets: [
        {
          label: 'Cards Reviewed',
          data: reviewedData,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#8B5CF6',
        },
      ],
    }
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { family: 'Space Grotesk, sans-serif', size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        titleFont: { family: 'Space Grotesk, sans-serif', size: 13 },
        bodyFont: { family: 'Space Grotesk, sans-serif', size: 12 },
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#F3F4F6' },
        ticks: { font: { family: 'Space Grotesk, sans-serif' } },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Space Grotesk, sans-serif' } },
        border: { display: false },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { usePointStyle: true, padding: 20, font: { family: 'Space Grotesk, sans-serif', size: 12 } },
      },
    },
  }

  const totalStudyTime = (quizAnalytics?.total_study_time || 0) + (flashcardAnalytics?.total_time_spent || 0)

  // Helper function to determine strength level
  const getStrengthLevel = (value: number, type: 'quiz' | 'flashcard') => {
    let level: 'weak' | 'average' | 'strong'
    let color: string
    
    if (type === 'quiz') {
      // Value is accuracy
      if (value < 50) { level = 'weak'; color = 'text-red-500 bg-red-50' }
      else if (value < 70) { level = 'average'; color = 'text-yellow-500 bg-yellow-50' }
      else { level = 'strong'; color = 'text-green-500 bg-green-50' }
    } else {
      // Value is again rate
      if (value > 50) { level = 'weak'; color = 'text-red-500 bg-red-50' }
      else if (value > 30) { level = 'average'; color = 'text-yellow-500 bg-yellow-50' }
      else { level = 'strong'; color = 'text-green-500 bg-green-50' }
    }
    return { level, color }
  }

  // Generate recommendation text
  const getRecommendationText = (): string => {
    const recommendations: string[] = []

    if (weakestQuizzes.length > 0) {
      recommendations.push(`Focus on "${weakestQuizzes[0].display_name}" to improve your quiz accuracy.`)
    }

    if (weakestFlashcards.length > 0) {
      recommendations.push(`Review "${weakestFlashcards[0].display_name}" again to master these concepts.`)
    }

    if (recommendations.length === 0) {
      return "Great job! Keep maintaining your study streak."
    }

    return recommendations.join(' ')
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={loadAnalytics} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors">
            Try Again
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="analytics">
      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-500 mt-1">Track your learning progress and habits</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Today</span>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Study Streak" 
            value={`${studyStreak?.current_streak || 0} Days`} 
            icon={
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            }
            trend="Keep it up!"
            trendColor="text-orange-600"
          />
          <StatCard 
            title="Total Study Time" 
            value={formatTime(totalStudyTime)} 
            icon={
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard 
            title="Quizzes Completed" 
            value={quizAnalytics?.total_quizzes_completed || 0} 
            icon={
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard 
            title="Cards Reviewed" 
            value={flashcardAnalytics?.total_reviewed || 0} 
            icon={
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Performance Chart Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
                      activeTab === 'quiz' 
                        ? 'text-primary border-b-2 border-primary bg-purple-50/50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Quiz Performance
                  </button>
                  <button
                    onClick={() => setActiveTab('flashcard')}
                    className={`flex-1 py-4 text-sm font-medium text-center transition-colors ${
                      activeTab === 'flashcard' 
                        ? 'text-primary border-b-2 border-primary bg-purple-50/50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Flashcard Activity
                  </button>
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'quiz' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Accuracy</p>
                        <p className="text-xl font-bold text-gray-900">{quizAnalytics?.accuracy_percentage.toFixed(1) || 0}%</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Correct</p>
                        <p className="text-xl font-bold text-green-600">{quizAnalytics?.total_correct || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Avg Time</p>
                        <p className="text-xl font-bold text-gray-900">{formatTime(quizAnalytics?.average_time_per_question || 0)}</p>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <Bar data={getQuizPerformanceData()} options={chartOptions} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-[250px] w-full">
                        <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Review Distribution</h4>
                        <Doughnut data={getFlashcardRatingData()} options={doughnutOptions} />
                      </div>
                      <div className="h-[250px] w-full">
                        <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Daily Trend</h4>
                        <Line data={getFlashcardDailyData()} options={chartOptions} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-full shadow-sm text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">AI Insight</h3>
                  <p className="text-gray-700 leading-relaxed">{getRecommendationText()}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            
            {/* Weakest Areas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Focus Areas</h3>
              
              <div className="space-y-6">
                {/* Weakest Quizzes */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Needs Improvement (Quizzes)</h4>
                  {weakestQuizzes.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {weakestQuizzes.map((quiz) => {
                        const { color } = getStrengthLevel(quiz.accuracy_percentage, 'quiz')
                        return (
                          <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-medium text-gray-900 truncate">{quiz.display_name}</p>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${quiz.accuracy_percentage}%` }}></div>
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>
                              {quiz.accuracy_percentage.toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100"></div>

                {/* Weakest Flashcards */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Difficult Topics (Flashcards)</h4>
                  {weakestFlashcards.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {weakestFlashcards.map((fc) => {
                        const { color } = getStrengthLevel(fc.again_rate, 'flashcard')
                        return (
                          <div key={fc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-sm font-medium text-gray-900 truncate">{fc.display_name}</p>
                              <p className="text-xs text-gray-500 mt-1">Again Rate</p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${color}`}>
                              {fc.again_rate.toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function StatCard({ title, value, icon, trend, trendColor }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, trendColor?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        {trend && <span className={`text-xs font-medium ${trendColor}`}>{trend}</span>}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-500">{title}</p>
    </div>
  )
}
