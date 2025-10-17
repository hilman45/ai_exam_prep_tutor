'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuizQuestion } from '../../lib/quizService'

interface QuizModeData {
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

export default function QuizModePage() {
  const [quizData, setQuizData] = useState<QuizModeData | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadQuizData = () => {
      try {
        setLoading(true)
        setError(null)

        // Get quiz data from sessionStorage
        const storedQuiz = sessionStorage.getItem('quizModeData')
        if (!storedQuiz) {
          setError('No quiz data found. Please start a quiz first.')
          return
        }

        const parsedQuiz = JSON.parse(storedQuiz)
        setQuizData(parsedQuiz)
        
        // Initialize user answers array
        const initialAnswers = new Array(parsedQuiz.questions.length).fill(null)
        setUserAnswers(initialAnswers)
      } catch (error) {
        console.error('Error loading quiz data:', error)
        setError('Failed to load quiz data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadQuizData()
  }, [])

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return // Don't allow selection after checking
    setSelectedAnswer(answerIndex)
  }

  const handleCheck = () => {
    if (selectedAnswer === null) return

    // Update user answers
    const newUserAnswers = [...userAnswers]
    newUserAnswers[currentQuestionIndex] = selectedAnswer
    setUserAnswers(newUserAnswers)

    // Show result
    setShowResult(true)
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setSelectedAnswer(userAnswers[currentQuestionIndex - 1])
      setShowResult(false)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(userAnswers[currentQuestionIndex + 1])
      setShowResult(false)
    }
  }

  const handleClose = () => {
    router.push('/quiz-edit')
  }

  const getProgressPercentage = () => {
    if (!quizData) return 0
    return ((currentQuestionIndex + 1) / quizData.questions.length) * 100
  }

  const getAnswerColor = (optionIndex: number) => {
    if (!showResult) return ''
    
    const currentQuestion = quizData?.questions[currentQuestionIndex]
    if (!currentQuestion) return ''

    const isCorrect = optionIndex === currentQuestion.answer_index
    const isSelected = optionIndex === selectedAnswer

    if (isCorrect) {
      return 'bg-green-100 border-green-500 text-green-800'
    } else if (isSelected && !isCorrect) {
      return 'bg-red-100 border-red-500 text-red-800'
    }
    
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Quiz</h2>
          <p className="text-gray-600 mb-4">{error || 'No quiz data available'}</p>
          <button
            onClick={() => router.push('/quiz-generator')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Generate New Quiz
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = quizData.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === quizData.questions.length - 1
  const isFirstQuestion = currentQuestionIndex === 0

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Question Count */}
        <div className="text-sm font-medium text-gray-600">
          {currentQuestionIndex + 1}/{quizData.questions.length}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Question */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 leading-relaxed">
            {currentQuestion.question}
          </h2>

          {/* Answer Options */}
          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showResult}
                className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ${
                  selectedAnswer === index && !showResult
                    ? 'border-primary bg-purple-50'
                    : showResult
                    ? getAnswerColor(index)
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                    selectedAnswer === index && !showResult
                      ? 'bg-primary text-white'
                      : showResult && index === currentQuestion.answer_index
                      ? 'bg-green-500 text-white'
                      : showResult && index === selectedAnswer && index !== currentQuestion.answer_index
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-gray-900 font-medium">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Result Message */}
        {showResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            selectedAnswer === currentQuestion.answer_index
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                selectedAnswer === currentQuestion.answer_index
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {selectedAnswer === currentQuestion.answer_index ? '✓' : '✗'}
              </div>
              <span className={`font-medium ${
                selectedAnswer === currentQuestion.answer_index
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}>
                {selectedAnswer === currentQuestion.answer_index
                  ? 'Correct!'
                  : `Incorrect. The correct answer is ${String.fromCharCode(65 + currentQuestion.answer_index)}.`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              isFirstQuestion
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>

          {/* Check/Next Button */}
          {!showResult ? (
            <button
              onClick={handleCheck}
              disabled={selectedAnswer === null}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                selectedAnswer === null
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Check
            </button>
          ) : (
            <button
              onClick={isLastQuestion ? handleClose : handleNext}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
