'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { folderService, Folder } from '../../../lib/folderService'
import { notesService, Summary } from '../../../lib/notesService'
import { quizService, Quiz } from '../../../lib/quizService'
import { flashcardService, FlashcardSet } from '../../../lib/flashcardService'
import DashboardLayout from '../../../components/DashboardLayout'
import KebabMenu from '../../../components/KebabMenu'

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Cache key helpers
const getCacheKey = (type: 'summaries' | 'quizzes' | 'flashcards', folderId: string) => 
  `folder_${type}_${folderId}`
const getCacheTimestampKey = (type: 'summaries' | 'quizzes' | 'flashcards', folderId: string) => 
  `folder_${type}_${folderId}_timestamp`

export default function FolderPage() {
  const [folder, setFolder] = useState<Folder | null>(null)
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz' | 'flashcards'>('notes')
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([])
  const [loading, setLoading] = useState(false) // Start with false for instant display
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [quizzesLoading, setQuizzesLoading] = useState(false)
  const [flashcardsLoading, setFlashcardsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState({
    summaries: true,
    quizzes: true,
    flashcards: true
  })
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'note' | 'quiz' | 'flashcard' | null
    id: string | null
    name: string | null
  }>({ type: null, id: null, name: null })
  const [deleting, setDeleting] = useState(false)
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get folder name from URL params for instant display
  const folderName = searchParams.get('name') || folder?.name || 'Loading...'

  // Track folder access
  const trackFolderAccess = (folder: Folder) => {
    if (typeof window === 'undefined') return
    try {
      const recent = localStorage.getItem('recent_folders')
      let recentFolders: Folder[] = recent ? JSON.parse(recent) : []
      recentFolders = recentFolders.filter(f => f.id !== folder.id)
      recentFolders.unshift(folder)
      localStorage.setItem('recent_folders', JSON.stringify(recentFolders.slice(0, 10))) // Keep max 10
    } catch (error) {
      console.error('Error tracking folder access:', error)
    }
  }

  useEffect(() => {
    // Load folder data
    if (params.folderId) {
      loadFolder(params.folderId as string)
    }
  }, [params.folderId])

  // Generic cache loader
  const loadCachedData = <T,>(type: 'summaries' | 'quizzes' | 'flashcards', folderId: string): T[] | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const cached = localStorage.getItem(getCacheKey(type, folderId))
      const timestamp = localStorage.getItem(getCacheTimestampKey(type, folderId))
      
      if (cached && timestamp) {
        const cacheAge = Date.now() - parseInt(timestamp, 10)
        if (cacheAge < CACHE_DURATION) {
          return JSON.parse(cached)
        }
      }
    } catch (error) {
      console.error(`Error loading cached ${type}:`, error)
    }
    
    return null
  }

  // Generic cache saver
  const saveDataToCache = <T,>(type: 'summaries' | 'quizzes' | 'flashcards', folderId: string, data: T[]) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(getCacheKey(type, folderId), JSON.stringify(data))
      localStorage.setItem(getCacheTimestampKey(type, folderId), Date.now().toString())
    } catch (error) {
      console.error(`Error saving ${type} to cache:`, error)
    }
  }

  const loadFolder = async (folderId: string) => {
    try {
      setError(null)
      const userFolders = await folderService.getFolders()
      const foundFolder = userFolders.find(f => f.id === folderId)
      if (foundFolder) {
        setFolder(foundFolder)
        trackFolderAccess(foundFolder) // Track folder access
        // Load summaries, quizzes, and flashcards (with caching)
        loadSummaries(folderId)
        loadQuizzes(folderId)
        loadFlashcards(folderId)
      } else {
        // Folder not found, redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error loading folder:', error)
      setError('Failed to load folder. Please try again.')
    }
  }

  const loadSummaries = async (folderId: string) => {
    // First, try to load from cache for instant display
    const cachedSummaries = loadCachedData<Summary>('summaries', folderId)
    if (cachedSummaries) {
      setSummaries(cachedSummaries)
      setIsInitialLoad(prev => ({ ...prev, summaries: false }))
    }
    
    // Then fetch fresh data in the background
    try {
      setSummariesLoading(true)
      const folderSummaries = await notesService.getSummariesByFolder(folderId)
      console.log('Fetched summaries:', folderSummaries) // Debug log
      setSummaries(folderSummaries)
      saveDataToCache('summaries', folderId, folderSummaries)
      setIsInitialLoad(prev => ({ ...prev, summaries: false }))
    } catch (error) {
      console.error('Error loading summaries:', error)
      if (!cachedSummaries) {
        setSummaries([])
        setError('Failed to load notes. Please try again.')
        setIsInitialLoad(prev => ({ ...prev, summaries: false }))
      }
    } finally {
      setSummariesLoading(false)
    }
  }

  const loadQuizzes = async (folderId: string) => {
    // First, try to load from cache for instant display
    const cachedQuizzes = loadCachedData<Quiz>('quizzes', folderId)
    if (cachedQuizzes) {
      setQuizzes(cachedQuizzes)
      setIsInitialLoad(prev => ({ ...prev, quizzes: false }))
    }
    
    // Then fetch fresh data in the background
    try {
      setQuizzesLoading(true)
      const folderQuizzes = await quizService.getQuizzesByFolder(folderId)
      console.log('Fetched quizzes:', folderQuizzes) // Debug log
      setQuizzes(folderQuizzes)
      saveDataToCache('quizzes', folderId, folderQuizzes)
      setIsInitialLoad(prev => ({ ...prev, quizzes: false }))
    } catch (error) {
      console.error('Error loading quizzes:', error)
      if (!cachedQuizzes) {
        setQuizzes([])
        setIsInitialLoad(prev => ({ ...prev, quizzes: false }))
      }
    } finally {
      setQuizzesLoading(false)
    }
  }

  const loadFlashcards = async (folderId: string) => {
    // First, try to load from cache for instant display
    const cachedFlashcards = loadCachedData<FlashcardSet>('flashcards', folderId)
    if (cachedFlashcards) {
      setFlashcards(cachedFlashcards)
      setIsInitialLoad(prev => ({ ...prev, flashcards: false }))
    }
    
    // Then fetch fresh data in the background
    try {
      setFlashcardsLoading(true)
      const folderFlashcards = await flashcardService.getFlashcardsByFolder(folderId)
      console.log('Fetched flashcards:', folderFlashcards) // Debug log
      setFlashcards(folderFlashcards)
      saveDataToCache('flashcards', folderId, folderFlashcards)
      setIsInitialLoad(prev => ({ ...prev, flashcards: false }))
    } catch (error) {
      console.error('Error loading flashcards:', error)
      if (!cachedFlashcards) {
        setFlashcards([])
        setIsInitialLoad(prev => ({ ...prev, flashcards: false }))
      }
    } finally {
      setFlashcardsLoading(false)
    }
  }

  const handleCreateNotes = () => {
    router.push('/notes-generator')
  }

  const handleCreateQuiz = () => {
    router.push('/quiz-generator')
  }

  const handleCreateFlashcards = () => {
    router.push('/flashcard-generator')
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
    // Store quiz data in sessionStorage for quiz mode
    const quizModeData = {
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
    
    sessionStorage.setItem('quizModeData', JSON.stringify(quizModeData))
    
    // Navigate to quiz mode
    router.push('/quiz-mode')
  }

  const handleEditQuiz = (quiz: Quiz) => {
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

  const handleOpenFlashcards = (flashcard: FlashcardSet) => {
    // Ensure cards is an array
    const cards = Array.isArray(flashcard.cards) ? flashcard.cards : []
    
    if (cards.length === 0) {
      console.error('No cards found in flashcard set:', flashcard.id)
      setError('This flashcard set has no cards. Please generate new flashcards.')
      return
    }
    
    // Store flashcard data in sessionStorage for flashcard study mode
    const flashcardStudyModeData = {
      fileId: flashcard.file_id,
      flashcardId: flashcard.id,
      flashcardName: flashcard.custom_name || flashcard.filename || 'Generated Flashcards',
      folderName: folderName,
      cards: cards, // Ensure we store the full array
      cardCount: cards.length,
      filename: flashcard.filename || 'Unknown File',
      cached: false,
      createdAt: flashcard.created_at
    }
    
    console.log(`Storing ${cards.length} cards for flashcard study session`)
    sessionStorage.setItem('flashcardStudyModeData', JSON.stringify(flashcardStudyModeData))
    
    // Also store in format expected by edit page
    sessionStorage.setItem('generatedFlashcards', JSON.stringify(flashcardStudyModeData))
    
    // Navigate to flashcard study mode
    router.push('/flashcard-study')
  }

  const handleEditFlashcards = (flashcard: FlashcardSet) => {
    // Store flashcard data in sessionStorage for the flashcard edit page
    const flashcardData = {
      fileId: flashcard.file_id,
      flashcardId: flashcard.id,
      flashcardName: flashcard.custom_name || flashcard.filename || 'Generated Flashcards',
      folderName: folderName,
      cards: flashcard.cards,
      cardCount: flashcard.cards?.length || 0,
      filename: flashcard.filename || 'Unknown File',
      cached: false,
      createdAt: flashcard.created_at
    }
    
    sessionStorage.setItem('generatedFlashcards', JSON.stringify(flashcardData))
    
    // Navigate to flashcard edit page
    router.push('/flashcard-edit')
  }

  const handleDeleteNote = (summary: Summary) => {
    setDeleteConfirm({
      type: 'note',
      id: summary.id,
      name: summary.custom_name || summary.display_name || summary.filename || 'this note'
    })
  }

  const handleDeleteQuiz = (quiz: Quiz) => {
    setDeleteConfirm({
      type: 'quiz',
      id: quiz.id,
      name: quiz.custom_name || quiz.display_name || quiz.filename || 'this quiz'
    })
  }

  const handleDeleteFlashcard = (flashcard: FlashcardSet) => {
    setDeleteConfirm({
      type: 'flashcard',
      id: flashcard.id,
      name: flashcard.custom_name || flashcard.filename || 'this flashcard set'
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type || !params.folderId) return

    try {
      setDeleting(true)
      const folderId = params.folderId as string
      
      if (deleteConfirm.type === 'note') {
        await notesService.deleteSummary(deleteConfirm.id)
        const updatedSummaries = summaries.filter(s => s.id !== deleteConfirm.id)
        setSummaries(updatedSummaries)
        saveDataToCache('summaries', folderId, updatedSummaries)
      } else if (deleteConfirm.type === 'quiz') {
        await quizService.deleteQuiz(deleteConfirm.id)
        const updatedQuizzes = quizzes.filter(q => q.id !== deleteConfirm.id)
        setQuizzes(updatedQuizzes)
        saveDataToCache('quizzes', folderId, updatedQuizzes)
      } else if (deleteConfirm.type === 'flashcard') {
        await flashcardService.deleteFlashcard(deleteConfirm.id)
        const updatedFlashcards = flashcards.filter(f => f.id !== deleteConfirm.id)
        setFlashcards(updatedFlashcards)
        saveDataToCache('flashcards', folderId, updatedFlashcards)
      }

      setDeleteConfirm({ type: null, id: null, name: null })
    } catch (error) {
      console.error('Error deleting:', error)
      setError(`Failed to delete ${deleteConfirm.type}. Please try again.`)
    } finally {
      setDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm({ type: null, id: null, name: null })
  }

  // Refresh data when returning from edit pages
  useEffect(() => {
    const handleFocus = () => {
      if (params.folderId) {
        const folderId = params.folderId as string
        // Refresh the active tab's data when window regains focus
        if (activeTab === 'quiz') {
          loadQuizzes(folderId)
        } else if (activeTab === 'flashcards') {
          loadFlashcards(folderId)
        } else if (activeTab === 'notes') {
          loadSummaries(folderId)
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [params.folderId, activeTab])

  return (
    <DashboardLayout 
      activeTab="home" 
      sidebarBackground="bg-white" 
      contentBackground="bg-gray-50"
    >
      <div className="p-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex items-start space-x-6 mb-10">
              {/* Folder Icon */}
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-sm overflow-hidden flex-shrink-0"
                style={{ 
                  backgroundColor: folder?.color || '#E9D5FF',
                  color: '#1e293b'
                }}
              >
                {folder?.picture_url ? (
                  <img 
                    src={folder.picture_url} 
                    alt={folderName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  folderName.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-1">
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>
                  <span>/</span>
                  <span>Folder</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {folderName}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {summaries.length} Notes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    {quizzes.length} Quizzes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {flashcards.length} Flashcards
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-200">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                    activeTab === 'notes'
                      ? 'border-cyan-500 text-cyan-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                    activeTab === 'quiz'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Quiz
                </button>
                <button
                  onClick={() => setActiveTab('flashcards')}
                  className={`px-6 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                    activeTab === 'flashcards'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Flashcards
                </button>
              </div>

              <div className="pb-2">
                {activeTab === 'notes' && (
                  <button
                    onClick={handleCreateNotes}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Note
                  </button>
                )}
                {activeTab === 'quiz' && (
                  <button
                    onClick={handleCreateQuiz}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Quiz
                  </button>
                )}
                {activeTab === 'flashcards' && (
                  <button
                    onClick={handleCreateFlashcards}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Flashcard
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
              {activeTab === 'notes' && (
                <div>
                  {error ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-red-100">
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-red-600 mb-4">{error}</p>
                      <button
                        onClick={() => loadFolder(params.folderId as string)}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : isInitialLoad.summaries && summaries.length === 0 ? (
                    // Skeleton loading
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          </div>
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : summaries.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                      <div className="w-20 h-20 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No notes yet</h3>
                      <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Upload a document or paste your text to automatically generate summarized notes with AI.
                      </p>
                      <button
                        onClick={handleCreateNotes}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        Create First Note
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Loading indicator when refreshing cached data */}
                      {summariesLoading && summaries.length > 0 && (
                        <div className="mb-6 flex items-center justify-center bg-cyan-50 py-2 rounded-lg">
                          <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-2 text-sm text-cyan-700 font-medium">Refreshing notes...</span>
                        </div>
                      )}
                      {/* Notes List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {summaries.map((summary) => (
                          <div
                            key={summary.id}
                            className="group bg-white border border-gray-100 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <KebabMenu
                                  onDelete={() => handleDeleteNote(summary)}
                                  itemName="note"
                                />
                              </div>

                              <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-cyan-700 transition-colors">
                                {summary.custom_name || summary.display_name || summary.filename || 'Generated Notes'}
                              </h3>
                              
                              <div className="flex items-center text-xs text-gray-500 mb-6">
                                <span className="truncate max-w-[150px]">{summary.filename || 'Unknown file'}</span>
                                <span className="mx-2">•</span>
                                <span>{new Date(summary.created_at).toLocaleDateString()}</span>
                              </div>
                              
                              <button
                                onClick={() => handleOpenNotes(summary)}
                                className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-gray-50 text-gray-700 hover:bg-cyan-600 hover:text-white group-hover:shadow-sm"
                              >
                                View Notes
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div>
                  {isInitialLoad.quizzes && quizzes.length === 0 ? (
                    // Skeleton loading
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          </div>
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                      <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No quizzes yet</h3>
                      <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Generate practice quizzes from your uploaded materials to test your knowledge.
                      </p>
                      <button
                        onClick={handleCreateQuiz}
                        className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        Create First Quiz
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Loading indicator when refreshing cached data */}
                      {quizzesLoading && quizzes.length > 0 && (
                        <div className="mb-6 flex items-center justify-center bg-yellow-50 py-2 rounded-lg">
                          <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-2 text-sm text-yellow-700 font-medium">Refreshing quizzes...</span>
                        </div>
                      )}
                      {/* Quiz List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="group bg-white border border-gray-100 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                  </svg>
                                </div>
                                <KebabMenu
                                  onDelete={() => handleDeleteQuiz(quiz)}
                                  onEdit={() => handleEditQuiz(quiz)}
                                  itemName="quiz"
                                />
                              </div>

                              <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-yellow-700 transition-colors">
                                {quiz.custom_name || quiz.display_name || quiz.filename || 'Generated Quiz'}
                              </h3>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
                                <span className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md font-medium">
                                  {quiz.questions?.length || 0} Questions
                                </span>
                                <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                              </div>
                              
                              <button
                                onClick={() => handleOpenQuiz(quiz)}
                                className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-gray-50 text-gray-700 hover:bg-yellow-500 hover:text-white group-hover:shadow-sm"
                              >
                                Start Quiz
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'flashcards' && (
                <div>
                  {isInitialLoad.flashcards && flashcards.length === 0 ? (
                    // Skeleton loading
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm animate-pulse"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                          </div>
                          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : flashcards.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
                      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No flashcards yet</h3>
                      <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        Create flashcards to memorize key concepts and terms from your study materials.
                      </p>
                      <button
                        onClick={handleCreateFlashcards}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
                      >
                        Create First Set
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Loading indicator when refreshing cached data */}
                      {flashcardsLoading && flashcards.length > 0 && (
                        <div className="mb-6 flex items-center justify-center bg-red-50 py-2 rounded-lg">
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-2 text-sm text-red-700 font-medium">Refreshing flashcards...</span>
                        </div>
                      )}
                      {/* Flashcards List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {flashcards.map((flashcard) => (
                          <div
                            key={flashcard.id}
                            className="group bg-white border border-gray-100 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                </div>
                                <KebabMenu
                                  onDelete={() => handleDeleteFlashcard(flashcard)}
                                  onEdit={() => handleEditFlashcards(flashcard)}
                                  itemName="flashcard"
                                />
                              </div>

                              <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-red-700 transition-colors">
                                {flashcard.custom_name || flashcard.filename || 'Generated Flashcards'}
                              </h3>
                              
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
                                <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md font-medium">
                                  {flashcard.cards?.length || 0} Cards
                                </span>
                                <span>{new Date(flashcard.created_at).toLocaleDateString()}</span>
                              </div>
                              
                              <button
                                onClick={() => handleOpenFlashcards(flashcard)}
                                className="w-full py-2.5 rounded-lg font-medium text-sm transition-colors bg-gray-50 text-gray-700 hover:bg-red-500 hover:text-white group-hover:shadow-sm"
                              >
                                Study Now
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirm.type && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Delete {deleteConfirm.type === 'note' ? 'Note' : deleteConfirm.type === 'quiz' ? 'Quiz' : 'Flashcard'}?
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <span className="font-medium">{deleteConfirm.name}</span>? 
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={cancelDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg font-medium transition-colors border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg font-medium transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{backgroundColor: '#EF4444'}}
                    onMouseEnter={(e) => {
                      if (!deleting) {
                        e.currentTarget.style.backgroundColor = '#DC2626'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!deleting) {
                        e.currentTarget.style.backgroundColor = '#EF4444'
                      }
                    }}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
    </DashboardLayout>
  )
}
