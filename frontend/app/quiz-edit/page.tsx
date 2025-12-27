'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { quizService, QuizQuestion } from '../../lib/quizService'
import QuizEditChat from '../../components/QuizEditChat'

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
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  
  // Auto-open chat when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setShowAIChat(false) // Start closed, user can open it
    }
  }, [isEditing])
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<QuizQuestion[] | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedQuestionForChat, setSelectedQuestionForChat] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // New question form state
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    answer_index: 0
  })

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

  const handleDeleteQuestion = (index: number) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = editedQuestions.filter((_, i) => i !== index)
      setEditedQuestions(updatedQuestions)
    }
  }

  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      alert('Please enter a question')
      return
    }
    if (newQuestion.options.filter(opt => opt.trim()).length < 2) {
      alert('Please provide at least 2 answer options')
      return
    }
    if (!newQuestion.options[newQuestion.answer_index]?.trim()) {
      alert('Please ensure the correct answer option is filled')
      return
    }

    const questionToAdd: QuizQuestion = {
      question: newQuestion.question.trim(),
      options: newQuestion.options.filter(opt => opt.trim()),
      answer_index: newQuestion.answer_index
    }

    setEditedQuestions([...editedQuestions, questionToAdd])
    setNewQuestion({
      question: '',
      options: ['', '', '', ''],
      answer_index: 0
    })
    setShowAddQuestionForm(false)
  }

  const handleAIGeneratedQuestions = (questions: QuizQuestion[]) => {
    setAiGeneratedQuestions(questions)
    setShowPreviewModal(true)
  }

  const handleApplyAIGeneratedQuestions = (replace: boolean) => {
    if (!aiGeneratedQuestions || aiGeneratedQuestions.length === 0) return

    // If a specific question is selected, only modify that question
    if (selectedQuestionForChat !== null && selectedQuestionForChat !== undefined) {
      const selectedIndex = selectedQuestionForChat
      
      if (replace) {
        // Replace only the selected question with the first AI-generated question
        const updatedQuestions = [...editedQuestions]
        updatedQuestions[selectedIndex] = aiGeneratedQuestions[0]
        setEditedQuestions(updatedQuestions)
        // Deselect after replacement
        setSelectedQuestionForChat(null)
      } else {
        // Insert new question(s) after the selected question
        const updatedQuestions = [...editedQuestions]
        updatedQuestions.splice(selectedIndex + 1, 0, ...aiGeneratedQuestions)
        setEditedQuestions(updatedQuestions)
      }
    } else {
      // No question selected - apply to all questions
      if (replace) {
        setEditedQuestions(aiGeneratedQuestions)
      } else {
        setEditedQuestions([...editedQuestions, ...aiGeneratedQuestions])
      }
    }

    setAiGeneratedQuestions(null)
    setShowPreviewModal(false)
    setShowAIChat(false)
  }

  const handleCancelPreview = () => {
    setAiGeneratedQuestions(null)
    setShowPreviewModal(false)
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
          {editedQuestions.map((question, questionIndex) => {
            const isSelectedForChat = selectedQuestionForChat === questionIndex
            
            return (
            <div 
              key={questionIndex} 
              id={`question-${questionIndex}`}
              className={`bg-white rounded-lg p-6 transition-all duration-300 ${
                isSelectedForChat
                  ? 'border-2 border-primary bg-purple-50 shadow-lg ring-4 ring-primary ring-opacity-30'
                  : 'border border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-semibold ${
                    isSelectedForChat ? 'text-primary' : 'text-gray-900'
                  }`}>
                    Question {questionIndex + 1}
                    {isSelectedForChat && (
                      <span className="ml-2 text-primary text-sm">💬 Getting Help</span>
                    )}
                  </h3>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">
                    Correct Answer: {String.fromCharCode(65 + question.answer_index)}
                  </div>
                  {isEditing && (
                    <>
                      <button
                        onClick={() => {
                          if (selectedQuestionForChat === questionIndex) {
                            setSelectedQuestionForChat(null)
                          } else {
                            setSelectedQuestionForChat(questionIndex)
                            setShowAIChat(true)
                            // Scroll to question when selected
                            setTimeout(() => {
                              const questionElement = document.getElementById(`question-${questionIndex}`)
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
                      <button
                        onClick={() => handleDeleteQuestion(questionIndex)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Delete question"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
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
            )
          })}

          {/* Add Question Form */}
          {isEditing && showAddQuestionForm && (
            <div className="bg-white border-2 border-primary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Question</h3>
              <button
                onClick={() => {
                  setShowAddQuestionForm(false)
                  setNewQuestion({
                    question: '',
                    options: ['', '', '', ''],
                    answer_index: 0
                  })
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question:
                </label>
                <textarea
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Enter your question..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Options:
                </label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        optionIndex === newQuestion.answer_index 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {String.fromCharCode(65 + optionIndex)}
                      </div>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updatedOptions = [...newQuestion.options]
                          updatedOptions[optionIndex] = e.target.value
                          setNewQuestion({ ...newQuestion, options: updatedOptions })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                      />
                      <button
                        onClick={() => setNewQuestion({ ...newQuestion, answer_index: optionIndex })}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          optionIndex === newQuestion.answer_index
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {optionIndex === newQuestion.answer_index ? 'Correct' : 'Set as Correct'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddQuestionForm(false)
                    setNewQuestion({
                      question: '',
                      options: ['', '', '', ''],
                      answer_index: 0
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Add Question
                </button>
              </div>
            </div>
            </div>
          )}

          {/* Add Question Button - at bottom of questions */}
          {isEditing && !showAddQuestionForm && (
            <button
              onClick={() => setShowAddQuestionForm(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary hover:bg-purple-50 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Add New Question</span>
            </button>
          )}
        </div>

        {/* Footer Actions */}
        {!isEditing && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStartQuiz}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Start Quiz
            </button>
          </div>
        )}

        {/* AI Chat Panel - Always visible when in edit mode */}
        {isEditing && quizData && (
          <QuizEditChat
            currentQuestions={editedQuestions}
            quizName={quizData.quizName}
            filename={quizData.filename}
            onClose={() => setShowAIChat(false)}
            onQuestionsGenerated={handleAIGeneratedQuestions}
            isOpen={showAIChat}
            onToggle={() => setShowAIChat(!showAIChat)}
            selectedQuestion={selectedQuestionForChat !== null ? editedQuestions[selectedQuestionForChat] : null}
            selectedQuestionIndex={selectedQuestionForChat}
          />
        )}

        {/* Preview Modal for AI Generated Questions */}
        {showPreviewModal && aiGeneratedQuestions && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelPreview}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Preview AI-Generated Questions</h3>
                <button
                  onClick={handleCancelPreview}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {selectedQuestionForChat !== null && selectedQuestionForChat !== undefined ? (
                    <>
                      <strong>1</strong> question generated for <strong>Question {selectedQuestionForChat + 1}</strong>. 
                      Choose how you'd like to apply it:
                    </>
                  ) : (
                    <>
                      <strong>{aiGeneratedQuestions.length}</strong> new question{aiGeneratedQuestions.length !== 1 ? 's' : ''} generated. 
                      Choose how you'd like to apply them:
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                {selectedQuestionForChat !== null && selectedQuestionForChat !== undefined && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This will only affect <strong>Question {selectedQuestionForChat + 1}</strong> (the highlighted question).
                    </p>
                  </div>
                )}
                {aiGeneratedQuestions.map((question, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {selectedQuestionForChat !== null && selectedQuestionForChat !== undefined
                          ? `Replacement for Question ${selectedQuestionForChat + 1}`
                          : `Question ${index + 1}`}
                      </span>
                      <span className="text-sm text-gray-500">
                        Correct: {String.fromCharCode(65 + question.answer_index)}
                      </span>
                    </div>
                    <p className="text-gray-900 mb-3">{question.question}</p>
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className={`text-sm p-2 rounded ${
                          optIndex === question.answer_index 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-white text-gray-700'
                        }`}>
                          <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelPreview}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep Current Version
                </button>
                {selectedQuestionForChat !== null && selectedQuestionForChat !== undefined ? (
                  <>
                    <button
                      onClick={() => handleApplyAIGeneratedQuestions(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      Add After This Question
                    </button>
                    <button
                      onClick={() => handleApplyAIGeneratedQuestions(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Replace This Question
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApplyAIGeneratedQuestions(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      Add to Current Questions
                    </button>
                    <button
                      onClick={() => handleApplyAIGeneratedQuestions(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Replace Current Questions
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
