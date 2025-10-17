'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { folderService, Folder } from '../../../lib/folderService'
import { notesService, Summary } from '../../../lib/notesService'
import { quizService, Quiz } from '../../../lib/quizService'
import DashboardLayout from '../../../components/DashboardLayout'

export default function FolderPage() {
  const [folder, setFolder] = useState<Folder | null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'flashcards'>('notes')
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get folder name from URL params for instant display
  const folderName = searchParams.get('name') || folder?.name || 'Loading...'

  useEffect(() => {
    // Load folder data
    if (params.folderId) {
      loadFolder(params.folderId as string)
    }
  }, [params.folderId])

  const loadFolder = async (folderId: string) => {
    try {
      setLoading(true)
      setError(null)
      const userFolders = await folderService.getFolders()
      const foundFolder = userFolders.find(f => f.id === folderId)
      if (foundFolder) {
        setFolder(foundFolder)
        // Load summaries and quizzes for this folder
        await Promise.all([
          loadSummaries(folderId),
          loadQuizzes(folderId)
        ])
      } else {
        // Folder not found, redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading folder:', error)
      setError('Failed to load folder. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSummaries = async (folderId: string) => {
    try {
      const folderSummaries = await notesService.getSummariesByFolder(folderId)
      console.log('Fetched summaries:', folderSummaries) // Debug log
      setSummaries(folderSummaries)
    } catch (error) {
      console.error('Error loading summaries:', error)
      setSummaries([])
      setError('Failed to load notes. Please try again.')
    }
  }

  const loadQuizzes = async (folderId: string) => {
    try {
      const folderQuizzes = await quizService.getQuizzesByFolder(folderId)
      console.log('Fetched quizzes:', folderQuizzes) // Debug log
      setQuizzes(folderQuizzes)
    } catch (error) {
      console.error('Error loading quizzes:', error)
      setQuizzes([])
      // Don't set error for quizzes since the endpoint might not be implemented yet
    }
  }

  const handleCreateNotes = () => {
    router.push('/notes-generator')
  }

  const handleCreateQuiz = () => {
    router.push('/quiz-generator')
  }

  const handleOpenNotes = (summary: Summary) => {
    // Navigate to notes page with URL parameters
    const urlParams = new URLSearchParams({
      summaryId: summary.id,
      folderId: params.folderId as string,
      folderName: folderName
    })
    
    router.push(`/notes?${urlParams.toString()}`)
  }

  const handleOpenQuiz = (quiz: Quiz) => {
    // Store quiz data in sessionStorage for the quiz edit page
    const quizData = {
      fileId: quiz.file_id,
      quizId: quiz.id,
      quizName: quiz.custom_name || quiz.display_name || 'Generated Quiz',
      folderName: folderName,
      questions: quiz.questions,
      questionCount: quiz.questions?.length || 0,
      filename: quiz.filename || 'Unknown File',
      cached: false,
      createdAt: quiz.created_at
    }
    
    sessionStorage.setItem('generatedQuiz', JSON.stringify(quizData))
    
    // Navigate to quiz edit page
    router.push('/quiz-edit')
  }

  // Refresh quizzes when returning from quiz edit
  useEffect(() => {
    const handleFocus = () => {
      if (params.folderId && activeTab === 'quiz') {
        loadQuizzes(params.folderId as string)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [params.folderId, activeTab])

  return (
    <DashboardLayout 
      activeTab="home" 
      sidebarBackground="bg-white" 
      contentBackground="bg-gray-100"
    >
      <div className="p-6">
            {/* Folder Name */}
            <div className="flex items-center space-x-3 mb-6">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <h1 className="text-xl font-semibold text-gray-800">
                {folderName}
              </h1>
            </div>

            {/* Section Tabs */}
            <div className="flex space-x-1 mb-4">
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'notes'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={activeTab === 'notes' ? {backgroundColor: '#892CDC'} : {}}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'quiz'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={activeTab === 'quiz' ? {backgroundColor: '#892CDC'} : {}}
              >
                Quiz
              </button>
              <button
                onClick={() => setActiveTab('flashcards')}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'flashcards'
                    ? 'text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                style={activeTab === 'flashcards' ? {backgroundColor: '#892CDC'} : {}}
              >
                Flashcards
              </button>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-400 mb-8"></div>

            {/* Content Area */}
            <div className="bg-gray-100 rounded-lg p-8 min-h-96">
              {activeTab === 'notes' && (
                <div>
                  {error ? (
                    <div className="text-center py-8">
                      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600">{error}</p>
                      </div>
                      <button
                        onClick={() => loadFolder(params.folderId as string)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-gray-600">Loading notes...</span>
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="text-center">
                      {/* Notes Empty State */}
                      <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <svg className="w-16 h-16" style={{color: '#06B6D4'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                        Upload a document, paste your notes to automatically generate summarize notes with AI.
                      </p>
                      <button
                        onClick={handleCreateNotes}
                        className="text-white px-8 py-3 rounded-lg font-medium transition-colors"
                        style={{backgroundColor: '#0f5bff'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f5bff'}
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Notes List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {summaries.map((summary) => (
                          <div
                            key={summary.id}
                            className="bg-white border border-slate-200 rounded-lg p-4 hover:brightness-95 hover:shadow-sm transition-all max-w-md"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {/* Note Name */}
                                <h3 className="font-medium text-slate-800 mb-2">
                                  {summary.custom_name || summary.display_name || summary.filename || 'Generated Notes'}
                                </h3>
                                
                                {/* Source */}
                                <div className="text-sm text-slate-600 mb-2">
                                  Source: {summary.filename || 'Unknown file'}
                                </div>
                                
                                {/* Date */}
                                <div className="text-sm text-slate-500">
                                  {new Date(summary.created_at).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              
                              {/* Open Button */}
                              <div className="ml-4 flex-shrink-0">
                                <button
                                  onClick={() => handleOpenNotes(summary)}
                                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2"
                                  style={{
                                    borderColor: '#BC6FF1',
                                    backgroundColor: '#F3F3F3',
                                    color: '#BC6FF1'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#BC6FF1'
                                    e.currentTarget.style.color = '#FFFFFF'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F3F3'
                                    e.currentTarget.style.color = '#BC6FF1'
                                  }}
                                >
                                  Open
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Create New Button */}
                      <div className="mt-6 text-center">
                        <button
                          onClick={handleCreateNotes}
                          className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                          style={{backgroundColor: '#0f5bff'}}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d4ed8'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f5bff'}
                        >
                          Create New Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-gray-600">Loading quizzes...</span>
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="text-center">
                      {/* Quiz Empty State */}
                      <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <svg className="w-16 h-16" style={{color: '#FACC15'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                        Generate practice quizzes from your uploaded materials to test your knowledge.
                      </p>
                      <button
                        onClick={handleCreateQuiz}
                        className="text-white px-8 py-3 rounded-lg font-medium transition-colors"
                        style={{backgroundColor: '#0f5bff'}}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f5bff'}
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Quiz List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="bg-white border border-slate-200 rounded-lg p-4 hover:brightness-95 hover:shadow-sm transition-all max-w-md"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {/* Quiz Name */}
                                <h3 className="font-medium text-slate-800 mb-2">
                                  {quiz.custom_name || quiz.display_name || quiz.filename || 'Generated Quiz'}
                                </h3>
                                
                                {/* Source */}
                                <div className="text-sm text-slate-600 mb-2">
                                  Source: {quiz.filename || 'Unknown file'}
                                </div>
                                
                                {/* Questions Count */}
                                <div className="text-sm text-slate-600 mb-2">
                                  Questions: {quiz.questions?.length || 0}
                                </div>
                                
                                {/* Date */}
                                <div className="text-sm text-slate-500">
                                  {new Date(quiz.created_at).toLocaleDateString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric'
                                  })}
                                </div>
                              </div>
                              
                              {/* Open Button */}
                              <div className="ml-4 flex-shrink-0">
                                <button
                                  onClick={() => handleOpenQuiz(quiz)}
                                  className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border-2"
                                  style={{
                                    borderColor: '#FACC15',
                                    backgroundColor: '#F3F3F3',
                                    color: '#FACC15'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FACC15'
                                    e.currentTarget.style.color = '#FFFFFF'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F3F3'
                                    e.currentTarget.style.color = '#FACC15'
                                  }}
                                >
                                  Open
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Create New Button */}
                      <div className="mt-6 text-center">
                        <button
                          onClick={handleCreateQuiz}
                          className="text-white px-6 py-2 rounded-lg font-medium transition-colors"
                          style={{backgroundColor: '#0f5bff'}}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d4ed8'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f5bff'}
                        >
                          Create New Quiz
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div className="text-center">
                  {/* Flashcards Empty State */}
                  <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-16 h-16" style={{color: '#EF4444'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-600 mb-6 text-lg leading-relaxed">
                    Create flashcards to memorize key concepts and terms from your study materials.
                  </p>
                  <button
                    className="text-white px-8 py-3 rounded-lg font-medium transition-colors"
                    style={{backgroundColor: '#0f5bff'}}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0d4ed8'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f5bff'}
                    onClick={() => {
                      // TODO: Implement flashcard creation
                      console.log('Create flashcards clicked')
                    }}
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>
    </DashboardLayout>
  )
}
