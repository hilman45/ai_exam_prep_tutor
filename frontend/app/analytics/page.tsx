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
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

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

  // Prepare quiz performance chart data (last 7 days - placeholder data for now)
  const getQuizPerformanceData = () => {
    // For now, we'll show today's data. In the future, this can be expanded to show last 7 days
    const labels = ['Today']
    const correctData = [quizAnalytics?.total_correct || 0]
    const attemptedData = [quizAnalytics?.total_attempted || 0]

    return {
      labels,
      datasets: [
        {
          label: 'Correct Answers',
          data: correctData,
          backgroundColor: '#892CDC',
          borderColor: '#892CDC',
          borderWidth: 2,
        },
        {
          label: 'Total Attempted',
          data: attemptedData,
          backgroundColor: '#BC6FF1',
          borderColor: '#BC6FF1',
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare flashcard rating chart data
  const getFlashcardRatingData = () => {
    if (!flashcardAnalytics) {
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
            flashcardAnalytics.again_count,
            flashcardAnalytics.good_count,
            flashcardAnalytics.easy_count,
          ],
          backgroundColor: ['#EF4444', '#FACC15', '#22C55E'],
          borderColor: ['#EF4444', '#FACC15', '#22C55E'],
          borderWidth: 2,
        },
      ],
    }
  }

  // Prepare flashcard daily review chart data
  const getFlashcardDailyData = () => {
    // For now, we'll show today's data. In the future, this can be expanded to show last 7 days
    const labels = ['Today']
    const reviewedData = [flashcardAnalytics?.total_reviewed || 0]

    return {
      labels,
      datasets: [
        {
          label: 'Cards Reviewed',
          data: reviewedData,
          borderColor: '#892CDC',
          backgroundColor: 'rgba(137, 44, 220, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }

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

  const totalStudyTime =
    (quizAnalytics?.total_study_time || 0) + (flashcardAnalytics?.total_time_spent || 0)

  // Helper function to determine strength level for quizzes
  const getQuizStrengthLevel = (accuracy: number): { level: 'weak' | 'average' | 'strong'; color: string; emoji: string } => {
    if (accuracy < 50) {
      return { level: 'weak', color: 'bg-red-100 text-red-800 border-red-300', emoji: '🔴' }
    } else if (accuracy < 70) {
      return { level: 'average', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🟡' }
    } else {
      return { level: 'strong', color: 'bg-green-100 text-green-800 border-green-300', emoji: '🟢' }
    }
  }

  // Helper function to determine strength level for flashcards
  const getFlashcardStrengthLevel = (againRate: number): { level: 'weak' | 'average' | 'strong'; color: string; emoji: string } => {
    if (againRate > 50) {
      return { level: 'weak', color: 'bg-red-100 text-red-800 border-red-300', emoji: '🔴' }
    } else if (againRate > 30) {
      return { level: 'average', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🟡' }
    } else {
      return { level: 'strong', color: 'bg-green-100 text-green-800 border-green-300', emoji: '🟢' }
    }
  }

  // Generate recommendation text
  const getRecommendationText = (): string => {
    const recommendations: string[] = []

    if (weakestQuizzes.length > 0) {
      const weakestQuiz = weakestQuizzes[0]
      recommendations.push(`Your lowest accuracy is in "${weakestQuiz.display_name}" — focus on these next.`)
    }

    if (weakestFlashcards.length > 0) {
      const weakestFlashcard = weakestFlashcards[0]
      recommendations.push(`You struggle most with "${weakestFlashcard.display_name}" — review this deck again.`)
    }

    if (recommendations.length === 0) {
      return "Keep up the great work! Continue practicing to maintain your progress."
    }

    return recommendations.join(' ')
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeTab="analytics">
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="analytics">
      <div className="p-6">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Analytics Tracking</h1>

        {/* Overview / Summary Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Quizzes Completed Today */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Quizzes Completed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {quizAnalytics?.total_quizzes_completed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Flashcards Reviewed Today */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Flashcards Reviewed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {flashcardAnalytics?.total_reviewed || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Study Time */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Study Time</p>
                  <p className="text-3xl font-bold text-gray-900">{formatTime(totalStudyTime)}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Current Study Streak */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Study Streak</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {studyStreak?.current_streak || 0} {studyStreak?.current_streak === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiz Analytics Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quiz Analytics</h2>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            {/* Quiz Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Attempted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizAnalytics?.total_attempted || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Correct</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizAnalytics?.total_correct || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quizAnalytics?.accuracy_percentage.toFixed(1) || 0}%
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Avg Time/Question</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(quizAnalytics?.average_time_per_question || 0)}
                </p>
              </div>
            </div>

            {/* Quiz Performance Chart */}
            <div className="h-64">
              <Bar data={getQuizPerformanceData()} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Flashcard Analytics Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Flashcard Analytics</h2>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            {/* Flashcard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Cards Reviewed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashcardAnalytics?.total_reviewed || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Cards Finished</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashcardAnalytics?.total_finished || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Review Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(flashcardAnalytics?.total_time_spent || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Easy/Good/Again</p>
                <p className="text-2xl font-bold text-gray-900">
                  {flashcardAnalytics
                    ? `${flashcardAnalytics.easy_count}/${flashcardAnalytics.good_count}/${flashcardAnalytics.again_count}`
                    : '0/0/0'}
                </p>
              </div>
            </div>

            {/* Flashcard Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating Distribution Chart */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Rating Distribution</h3>
                <div className="h-64">
                  <Bar data={getFlashcardRatingData()} options={chartOptions} />
                </div>
              </div>

              {/* Daily Review Trend Chart */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Daily Review Trend</h3>
                <div className="h-64">
                  <Line data={getFlashcardDailyData()} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Review Suggestions Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Smart Review Suggestions</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top 3 Weakest Quizzes */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Top 3 Weakest Quiz Lists</h3>
              {weakestQuizzes.length === 0 ? (
                <p className="text-gray-500 text-sm">No quiz data available yet. Complete some quizzes to see your weak areas.</p>
              ) : (
                <div className="space-y-3">
                  {weakestQuizzes.map((quiz, index) => {
                    const strength = getQuizStrengthLevel(quiz.accuracy_percentage)
                    return (
                      <div
                        key={quiz.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{quiz.display_name}</h4>
                            <p className="text-sm text-gray-600">
                              Accuracy: {quiz.accuracy_percentage.toFixed(1)}% ({quiz.total_correct}/{quiz.total_attempted})
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${strength.color} flex items-center gap-1`}>
                            <span>{strength.emoji}</span>
                            <span className="capitalize">{strength.level}</span>
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              strength.level === 'weak'
                                ? 'bg-red-500'
                                : strength.level === 'average'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${quiz.accuracy_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top 3 Weakest Flashcards */}
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Top 3 Weakest Flashcard Lists</h3>
              {weakestFlashcards.length === 0 ? (
                <p className="text-gray-500 text-sm">No flashcard data available yet. Review some flashcards to see your weak areas.</p>
              ) : (
                <div className="space-y-3">
                  {weakestFlashcards.map((flashcard, index) => {
                    const strength = getFlashcardStrengthLevel(flashcard.again_rate)
                    return (
                      <div
                        key={flashcard.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{flashcard.display_name}</h4>
                            <p className="text-sm text-gray-600">
                              Again Rate: {flashcard.again_rate.toFixed(1)}% ({flashcard.again_count}/{flashcard.total_reviewed} reviews)
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${strength.color} flex items-center gap-1`}>
                            <span>{strength.emoji}</span>
                            <span className="capitalize">{strength.level}</span>
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              strength.level === 'weak'
                                ? 'bg-red-500'
                                : strength.level === 'average'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${flashcard.again_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recommendation Text */}
          <div className="bg-primary bg-opacity-10 rounded-lg border-2 border-primary border-opacity-30 p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Recommendation</h4>
                <p className="text-gray-700 leading-relaxed">{getRecommendationText()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

