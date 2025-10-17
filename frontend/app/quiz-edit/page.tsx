'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { quizService, QuizQuestion } from '../../lib/quizService'

interface GeneratedQuizData {
  fileId: string
  quizId: string
  quizName: string
  folderName: string
  questions: QuizQuestion[]
  questionCount: number
  filename: string
  cached: boolean
  createdAt?: string
}

export default function QuizEditPage() {
  const [quizData, setQuizData] = useState<GeneratedQuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedQuestions, setEditedQuestions] = useState<QuizQuestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadQuizData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get parameters from URL
        const quizId = searchParams.get('quizId')
        const folderId = searchParams.get('folderId')
        const folderName = searchParams.get('folderName')

        if (!quizId) {
          // Fallback to sessionStorage for backward compatibility
          const storedQuiz = sessionStorage.getItem('generatedQuiz')
          if (storedQuiz) {
            try {
              const parsedQuiz = JSON.parse(storedQuiz)
              setQuizData(parsedQuiz)
              setEditedQuestions(parsedQuiz.questions)
              return
            } catch (error) {
              console.error('Error parsing quiz data:', error)
              setError('Invalid quiz data. Please generate new quiz.')
              return
            }
          } else {
            setError('No quiz specified. Please select quiz from a folder.')
            return
          }
        }

        // For now, we'll use sessionStorage since the getQuiz endpoint is not implemented
        // TODO: Implement getQuiz endpoint in backend
        setError('Quiz loading from URL parameters not implemented yet. Please use the quiz generator.')
        return
      } catch (error) {
        console.error('Error loading quiz:', error)
        setError('Failed to load quiz. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [searchParams])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!quizData) return

    setIsSaving(true)
    try {
      // Save changes to the database
      await quizService.updateQuiz(quizData.quizId, editedQuestions)
      setIsEditing(false)
      
      // Update the quiz data with edited questions
      setQuizData(prev => prev ? { ...prev, questions: editedQuestions } : null)
      
      // Update sessionStorage with edited questions
      const updatedQuizData = { ...quizData, questions: editedQuestions }
      sessionStorage.setItem('generatedQuiz', JSON.stringify(updatedQuizData))
    } catch (error) {
      console.error('Error saving quiz:', error)
      setError('Failed to save quiz. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedQuestions(quizData?.questions || [])
    setIsEditing(false)
  }

  const handleQuestionChange = (index: number, field: 'question' | 'options' | 'answer_index', value: string | string[] | number) => {
    const updatedQuestions = [...editedQuestions]
    if (field === 'question') {
      updatedQuestions[index].question = value as string
    } else if (field === 'options') {
      updatedQuestions[index].options = value as string[]
    } else if (field === 'answer_index') {
      updatedQuestions[index].answer_index = value as number
    }
    setEditedQuestions(updatedQuestions)
  }

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...editedQuestions]
    updatedQuestions[questionIndex].options[optionIndex] = value
    setEditedQuestions(updatedQuestions)
  }

  const handleStartQuiz = () => {
    if (!quizData) return

    // Store quiz data for quiz mode
    const quizModeData = {
      ...quizData,
      questions: editedQuestions
    }
    sessionStorage.setItem('quizModeData', JSON.stringify(quizModeData))
    
    // Navigate to quiz mode
    router.push('/quiz-mode')
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="quiz">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeTab="quiz">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Quiz</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/quiz-generator')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Generate New Quiz
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!quizData) {
    return (
      <DashboardLayout activeTab="quiz">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">No quiz data available.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="quiz">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{quizData.quizName}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>📁 {quizData.folderName}</span>
              <span>📄 {quizData.filename}</span>
              <span>❓ {quizData.questionCount} questions</span>
              {quizData.cached && <span className="text-green-600">✓ Cached</span>}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit Questions
                </button>
                <button
                  onClick={handleStartQuiz}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Start Quiz
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {editedQuestions.map((question, questionIndex) => (
            <div key={questionIndex} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question {questionIndex + 1}
                </h3>
                <div className="text-sm text-gray-500">
                  Correct Answer: {String.fromCharCode(65 + question.answer_index)}
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question:
                </label>
                {isEditing ? (
                  <textarea
                    value={question.question}
                    onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{question.question}</p>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Options:
                </label>
                {question.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      optionIndex === question.answer_index 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + optionIndex)}
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    ) : (
                      <p className="flex-1 text-gray-900">{option}</p>
                    )}
                    {isEditing && (
                      <button
                        onClick={() => handleQuestionChange(questionIndex, 'answer_index', optionIndex)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          optionIndex === question.answer_index
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {optionIndex === question.answer_index ? 'Correct' : 'Set as Correct'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStartQuiz}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
