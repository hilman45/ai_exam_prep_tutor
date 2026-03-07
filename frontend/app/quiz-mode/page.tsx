'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QuizQuestion, quizService } from '../../lib/quizService'
import QuizChat from '../../components/QuizChat'

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
  const [selectedQuestionForChat, setSelectedQuestionForChat] = useState<number | null>(null)
  const router = useRouter()
  const questionStartTime = useRef<number | null>(null)
  const trackedQuestions = useRef<Set<number>>(new Set())

  // Scroll to question when chat is opened
  useEffect(() => {
    if (selectedQuestionForChat !== null && showReviewModal) {
      const questionElement = document.getElementById(`question-${selectedQuestionForChat}`)
      if (questionElement) {
        setTimeout(() => {
          questionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
        }, 100)
      }
    }
  }, [selectedQuestionForChat, showReviewModal])

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
        
        // Shuffle questions randomly each time (Fisher-Yates shuffle)
        const shuffledQuestions = [...parsedQuiz.questions]
        for (let i = shuffledQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]]
        }
        
        // Update parsedQuiz with shuffled questions
        const quizWithShuffledQuestions = {
          ...parsedQuiz,
          questions: shuffledQuestions
        }
        
        setQuizData(quizWithShuffledQuestions)
        
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
    const totalQuestions = results.correct + results.wrong
    const accuracyPercentage = results.accuracy
    
    // Calculate donut chart values
    const chartSize = 220
    const radius = 80
    const circumference = 2 * Math.PI * radius
    const correctPercentage = totalQuestions > 0 ? (results.correct / totalQuestions) * 100 : 0
    const wrongPercentage = totalQuestions > 0 ? (results.wrong / totalQuestions) * 100 : 0
    const correctArcLength = (correctPercentage / 100) * circumference
    const wrongArcLength = (wrongPercentage / 100) * circumference
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button 
            onClick={handleQuit}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Quiz Results</h1>
          <div className="w-6"></div>
        </header>

        {/* Completion Screen */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Section - Text and Actions */}
            <div>
              <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                Quiz Completed
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {results.accuracy >= 80 ? "Outstanding!" : results.accuracy >= 60 ? "Good Job!" : "Keep Practicing!"}
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                {results.accuracy >= 80 
                  ? "You've mastered this topic! Your knowledge is solid."
                  : results.accuracy >= 60
                  ? "You're doing well, but there's still a bit of room for improvement."
                  : "Don't worry, mistakes help you learn. Review your answers to improve."}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
                  <span className="text-3xl font-bold text-gray-900">{totalQuestions}</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Total</span>
                </div>
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 shadow-sm flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-600">{results.correct}</span>
                  <span className="text-xs text-green-600/80 font-bold uppercase tracking-wider mt-1">Correct</span>
                </div>
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col items-center">
                  <span className="text-3xl font-bold text-red-600">{results.wrong}</span>
                  <span className="text-xs text-red-600/80 font-bold uppercase tracking-wider mt-1">Wrong</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-8 py-4 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/25 font-bold flex items-center justify-center gap-2 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Review Answers
                </button>
                
                <button
                  onClick={handleQuit}
                  className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-bold"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>

            {/* Right Section - Donut Chart */}
            <div className="flex flex-col justify-center items-center">
              <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-xl relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

                <h3 className="text-xl font-bold text-gray-900 mb-8 text-center relative z-10">Performance Score</h3>
                
                {/* Donut Chart */}
                <div className="relative z-10" style={{ width: `${chartSize}px`, height: `${chartSize}px` }}>
                  <svg width={chartSize} height={chartSize} className="transform -rotate-90 drop-shadow-md">
                    {/* Background circle */}
                    <circle
                      cx={chartSize / 2}
                      cy={chartSize / 2}
                      r={radius}
                      fill="none"
                      stroke="#F3F4F6"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    {/* Correct answers (green) */}
                    <circle
                      cx={chartSize / 2}
                      cy={chartSize / 2}
                      r={radius}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="20"
                      strokeDasharray={`${correctArcLength} ${circumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Wrong answers (red) - only if there are wrong answers */}
                    {results.wrong > 0 && (
                      <circle
                        cx={chartSize / 2}
                        cy={chartSize / 2}
                        r={radius}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="20"
                        strokeDasharray={`${wrongArcLength} ${circumference}`}
                        strokeDashoffset={-correctArcLength}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    )}
                  </svg>
                  {/* Percentage text in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold text-gray-900 tracking-tight">
                      {accuracyPercentage.toFixed(0)}%
                    </div>
                    <div className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-wide">Accuracy</div>
                  </div>
                </div>
              </div>
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
                  const isSelectedForChat = selectedQuestionForChat === index
                  
                  return (
                    <div
                      key={index}
                      id={`question-${index}`}
                      className={`border-2 rounded-lg p-4 transition-all duration-300 ${
                        isSelectedForChat
                          ? 'border-primary bg-purple-50 shadow-lg ring-4 ring-primary ring-opacity-30'
                          : !isAnswered
                          ? 'border-gray-200 bg-gray-50'
                          : isCorrect
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {/* Question Number and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            isSelectedForChat ? 'text-primary' : 'text-gray-900'
                          }`}>
                            Question {index + 1}
                            {isSelectedForChat && (
                              <span className="ml-2 text-primary text-sm">💬 Getting Help</span>
                            )}
                          </span>
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
                        <button
                          onClick={() => {
                            if (selectedQuestionForChat === index) {
                              setSelectedQuestionForChat(null)
                            } else {
                              setSelectedQuestionForChat(index)
                              // Scroll to question when selected
                              setTimeout(() => {
                                const questionElement = document.getElementById(`question-${index}`)
                                if (questionElement) {
                                  questionElement.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'center' 
                                  })
                                }
                              }, 100)
                            }
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                            isSelectedForChat 
                              ? 'bg-gray-500 text-white' 
                              : ''
                          }`}
                          style={!isSelectedForChat ? {
                            backgroundColor: '#892CDC',
                            color: '#FFFFFF'
                          } : {}}
                          onMouseEnter={(e) => {
                            if (!isSelectedForChat) {
                              e.currentTarget.style.backgroundColor = '#7B1FA2'
                              e.currentTarget.style.transform = 'scale(1.05)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelectedForChat) {
                              e.currentTarget.style.backgroundColor = '#892CDC'
                              e.currentTarget.style.transform = 'scale(1)'
                            }
                          }}
                        >
                          {isSelectedForChat ? 'Close Help' : 'Get Help'}
                        </button>
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

        {/* Quiz Chat - Always show in review modal */}
        {quizData && showReviewModal && (
          <QuizChat
            question={selectedQuestionForChat !== null ? quizData.questions[selectedQuestionForChat] : null}
            questionIndex={selectedQuestionForChat}
            userAnswer={selectedQuestionForChat !== null ? userAnswers[selectedQuestionForChat] : null}
            topicName={null}
            explanation={null}
            allQuestions={quizData.questions}
            quizName={quizData.quizName}
          />
        )}
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close quiz"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Progress Bar Container */}
          <div className="flex-1 max-w-md mx-4">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-1">
              <span>Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
          </div>

          {/* Question Counter */}
          <div className="flex items-center space-x-1 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            <span className="text-gray-900">{currentQuestionIndex + 1}</span>
            <span className="text-gray-400">/</span>
            <span>{quizData.questions.length}</span>
          </div>
        </div>
      </header>

      {/* Main Content - reserve space for header, feedback, and footer */}
      <main className="flex-1 min-h-0 max-w-3xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Question Card - body scrolls so feedback stays visible above footer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0 max-h-[calc(100vh-14rem)]">
          {/* Scrollable: question + options (capped height so feedback fits on screen) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <div className="p-5 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 leading-relaxed">
                {currentQuestion.question}
              </h2>

              {/* Answer Options */}
              <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isDisabled = showResult || isQuestionLocked
                const isSelected = selectedAnswer === index
                const isCorrect = index === currentQuestion.answer_index
                
                let buttonStyle = "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                let indicatorStyle = "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                let icon = String.fromCharCode(65 + index)

                if (isSelected && !isDisabled) {
                  buttonStyle = "border-primary bg-primary/5 ring-1 ring-primary"
                  indicatorStyle = "bg-primary text-white"
                } else if (showResult || isQuestionLocked) {
                  if (isCorrect) {
                    buttonStyle = "border-green-500 bg-green-50 ring-1 ring-green-500"
                    indicatorStyle = "bg-green-500 text-white"
                    icon = "✓"
                  } else if (isSelected && !isCorrect) {
                    buttonStyle = "border-red-500 bg-red-50 ring-1 ring-red-500"
                    indicatorStyle = "bg-red-500 text-white"
                    icon = "✗"
                  } else {
                    buttonStyle = "border-gray-200 opacity-60"
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={isDisabled}
                    className={`group w-full p-3 text-left border-2 rounded-xl transition-all duration-200 flex items-center ${buttonStyle} ${
                      isDisabled ? 'cursor-default' : 'cursor-pointer transform active:scale-[0.99]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold mr-3 transition-colors flex-shrink-0 ${indicatorStyle}`}>
                      {icon}
                    </div>
                    <span className={`text-lg font-medium flex-1 ${
                      isDisabled ? 'text-gray-600' : 'text-gray-800'
                    }`}>{option}</span>
                    
                    {(showResult || isQuestionLocked) && isCorrect && (
                      <span className="ml-3 text-green-600 font-medium text-sm whitespace-nowrap hidden sm:inline-block">Correct Answer</span>
                    )}
                    {(showResult || isQuestionLocked) && isSelected && !isCorrect && (
                      <span className="ml-3 text-red-600 font-medium text-sm whitespace-nowrap hidden sm:inline-block">Your Answer</span>
                    )}
                  </button>
                )
              })}
            </div>
            </div>
          </div>
          
          {/* Feedback Section - always visible below card, above footer */}
          {(showResult || isQuestionLocked) && selectedAnswer !== null && (
            <div className={`px-5 py-3 border-t ${
              selectedAnswer === currentQuestion.answer_index
                ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-full mt-0.5 ${
                  selectedAnswer === currentQuestion.answer_index
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {selectedAnswer === currentQuestion.answer_index ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className={`font-bold ${
                    selectedAnswer === currentQuestion.answer_index
                      ? 'text-green-800'
                      : 'text-red-800'
                  }`}>
                    {selectedAnswer === currentQuestion.answer_index ? 'Excellent!' : 'Incorrect'}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    selectedAnswer === currentQuestion.answer_index
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    {selectedAnswer === currentQuestion.answer_index
                      ? 'You got the correct answer.'
                      : `The correct answer is option ${String.fromCharCode(65 + currentQuestion.answer_index)}.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center ${
              isFirstQuestion
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {!showResult && !isQuestionLocked ? (
            <button
              onClick={handleCheck}
              disabled={selectedAnswer === null}
              className={`flex-1 sm:flex-none sm:w-48 px-8 py-3 rounded-xl font-bold text-white shadow-lg shadow-primary/25 transition-all duration-200 flex items-center justify-center ${
                selectedAnswer === null
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={isLastQuestion ? handleFinishQuiz : handleNext}
              className="flex-1 sm:flex-none sm:w-48 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center"
            >
              {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
              {!isLastQuestion && (
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
    </>
  )
}
