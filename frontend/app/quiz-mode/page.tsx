'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QuizQuestion, quizService } from '../../lib/quizService'

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
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set())
  const router = useRouter()
  const questionStartTime = useRef<number | null>(null)
  const trackedQuestions = useRef<Set<number>>(new Set())

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

  // Track question start time when question changes (only for unanswered questions)
  useEffect(() => {
    if (quizData && !showResult && !checkedQuestions.has(currentQuestionIndex)) {
      questionStartTime.current = Date.now()
    }
  }, [currentQuestionIndex, quizData, showResult, checkedQuestions])

  const handleAnswerSelect = (answerIndex: number) => {
    // Don't allow selection if result is shown or if question was previously checked
    if (showResult || checkedQuestions.has(currentQuestionIndex)) return
    setSelectedAnswer(answerIndex)
  }

  const handleCheck = async () => {
    if (selectedAnswer === null || !quizData) return

    // Calculate time taken
    const endTime = Date.now()
    const startTime = questionStartTime.current || endTime
    const timeTakenSeconds = (endTime - startTime) / 1000

    // Check if answer is correct
    const currentQuestion = quizData.questions[currentQuestionIndex]
    const isCorrect = selectedAnswer === currentQuestion.answer_index

    // Update user answers
    const newUserAnswers = [...userAnswers]
    newUserAnswers[currentQuestionIndex] = selectedAnswer
    setUserAnswers(newUserAnswers)

    // Mark this question as checked
    setCheckedQuestions(prev => new Set(prev).add(currentQuestionIndex))

    // Show result
    setShowResult(true)

    // Record interaction if not already tracked for this question
    if (!trackedQuestions.current.has(currentQuestionIndex)) {
      trackedQuestions.current.add(currentQuestionIndex)
      
      try {
        await quizService.recordInteraction(quizData.quizId, {
          question_id: currentQuestionIndex,
          is_correct: isCorrect,
          time_taken: timeTakenSeconds
        })
      } catch (error) {
        // Silently fail - don't interrupt quiz flow
        console.error('Failed to record interaction:', error)
      }
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1
      setCurrentQuestionIndex(prevIndex)
      setSelectedAnswer(userAnswers[prevIndex])
      
      // If this question was previously checked, show the result immediately
      if (checkedQuestions.has(prevIndex)) {
        setShowResult(true)
      } else {
        setShowResult(false)
        // Reset start time only for unanswered questions
        questionStartTime.current = Date.now()
      }
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < (quizData?.questions.length || 0) - 1) {
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      setSelectedAnswer(userAnswers[nextIndex])
      
      // If this question was previously checked, show the result immediately
      if (checkedQuestions.has(nextIndex)) {
        setShowResult(true)
      } else {
        setShowResult(false)
        // Reset start time only for unanswered questions
        questionStartTime.current = Date.now()
      }
    }
  }

  const handleFinishQuiz = () => {
    setQuizCompleted(true)
  }

  const handleQuit = () => {
    router.push('/dashboard')
  }

  const handleClose = () => {
    router.push('/quiz-edit')
  }

  // Calculate quiz results
  const calculateResults = () => {
    if (!quizData) return { correct: 0, wrong: 0, accuracy: 0 }
    
    let correct = 0
    let wrong = 0
    
    quizData.questions.forEach((question, index) => {
      const userAnswer = userAnswers[index]
      if (userAnswer !== null) {
        if (userAnswer === question.answer_index) {
          correct++
        } else {
          wrong++
        }
      }
    })
    
    const total = correct + wrong
    const accuracy = total > 0 ? (correct / total) * 100 : 0
    
    return { correct, wrong, accuracy }
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
  const isQuestionLocked = checkedQuestions.has(currentQuestionIndex)
  const results = calculateResults()

  // Show results screen if quiz is completed
  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Results Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quiz Results</h2>
            
            {/* Results Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Correct Answers */}
              <div className="text-center p-6 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">{results.correct}</div>
                <div className="text-sm text-green-700 font-medium">Correct</div>
              </div>
              
              {/* Wrong Answers */}
              <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-3xl font-bold text-red-600 mb-2">{results.wrong}</div>
                <div className="text-sm text-red-700 font-medium">Wrong</div>
              </div>
              
              {/* Accuracy */}
              <div className="text-center p-6 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-3xl font-bold mb-2" style={{color: '#892CDC'}}>
                  {results.accuracy.toFixed(1)}%
                </div>
                <div className="text-sm font-medium" style={{color: '#892CDC'}}>Accuracy</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2"
                style={{
                  borderColor: '#892CDC',
                  backgroundColor: '#F3F3F3',
                  color: '#892CDC'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#892CDC'
                  e.currentTarget.style.color = '#FFFFFF'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F3F3'
                  e.currentTarget.style.color = '#892CDC'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                Review Answers
              </button>
              
              <button
                onClick={handleQuit}
                className="px-6 py-3 rounded-lg font-medium text-white transition-all duration-200"
                style={{backgroundColor: '#892CDC'}}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#7B1FA2'
                  e.currentTarget.style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#892CDC'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                Quit
              </button>
            </div>
          </div>
        </div>

        {/* Review Answers Modal */}
        {showReviewModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Review Answers</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {quizData.questions.map((question, index) => {
                  const userAnswer = userAnswers[index]
                  const isCorrect = userAnswer !== null && userAnswer === question.answer_index
                  const isAnswered = userAnswer !== null
                  
                  return (
                    <div
                      key={index}
                      className={`border-2 rounded-lg p-4 ${
                        !isAnswered
                          ? 'border-gray-200 bg-gray-50'
                          : isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {/* Question Number and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Question {index + 1}</span>
                          {!isAnswered ? (
                            <span className="px-2 py-1 bg-gray-400 text-white text-xs font-medium rounded">
                              Not Answered
                            </span>
                          ) : isCorrect ? (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                              Correct
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                              Wrong
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-gray-900 font-medium mb-4">{question.question}</p>

                      {/* Options */}
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => {
                          const isUserAnswer = optIndex === userAnswer
                          const isCorrectAnswer = optIndex === question.answer_index
                          
                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrectAnswer
                                  ? 'border-green-500 bg-green-100'
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'border-red-500 bg-red-100'
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                                  isCorrectAnswer
                                    ? 'bg-green-500 text-white'
                                    : isUserAnswer && !isCorrectAnswer
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                }`}>
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="text-gray-900">{option}</span>
                                {isCorrectAnswer && (
                                  <span className="ml-auto text-green-600 font-medium text-sm">✓ Correct Answer</span>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <span className="ml-auto text-red-600 font-medium text-sm">✗ Your Answer</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-6 py-2 rounded-lg font-medium text-white transition-all duration-200"
                  style={{backgroundColor: '#892CDC'}}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#7B1FA2'
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#892CDC'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
            {currentQuestion.options.map((option, index) => {
              const isDisabled = showResult || isQuestionLocked
              const isSelected = selectedAnswer === index
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={isDisabled}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 ${
                    isDisabled
                      ? 'cursor-not-allowed opacity-75'
                      : 'cursor-pointer'
                  } ${
                    isSelected && !isDisabled
                      ? 'border-primary bg-purple-50'
                      : showResult || isQuestionLocked
                      ? getAnswerColor(index)
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-4 ${
                      isSelected && !isDisabled
                        ? 'bg-primary text-white'
                        : (showResult || isQuestionLocked) && index === currentQuestion.answer_index
                        ? 'bg-green-500 text-white'
                        : (showResult || isQuestionLocked) && index === selectedAnswer && index !== currentQuestion.answer_index
                        ? 'bg-red-500 text-white'
                        : isDisabled && isSelected
                        ? 'bg-gray-400 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className={`font-medium ${
                      isDisabled ? 'text-gray-600' : 'text-gray-900'
                    }`}>{option}</span>
                    {isQuestionLocked && isSelected && index !== currentQuestion.answer_index && (
                      <span className="ml-auto text-red-600 text-sm font-medium">✗ Your Answer</span>
                    )}
                    {isQuestionLocked && index === currentQuestion.answer_index && (
                      <span className="ml-auto text-green-600 text-sm font-medium">✓ Correct</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Result Message */}
        {(showResult || isQuestionLocked) && selectedAnswer !== null && (
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
          {!showResult && !isQuestionLocked ? (
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
              onClick={isLastQuestion ? handleFinishQuiz : handleNext}
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
