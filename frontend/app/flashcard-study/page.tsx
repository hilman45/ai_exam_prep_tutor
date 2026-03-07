'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { flashcardService, FlashcardCardState } from '@/lib/flashcardService'
import FlashcardChat from '@/components/FlashcardChat'

interface Flashcard {
  front: string
  back: string
}

interface FlashcardStudyData {
  fileId: string
  flashcardId: string
  flashcardName: string
  folderName: string
  cards: Flashcard[]
  cardCount: number
  filename: string
  cached: boolean
  createdAt?: string
}

interface DueCard {
  card: Flashcard
  originalIndex: number
  shuffledIndex: number
}

export default function FlashcardStudyPage() {
  const [studyData, setStudyData] = useState<FlashcardStudyData | null>(null)
  const [allCards, setAllCards] = useState<Flashcard[]>([])
  const [cardStates, setCardStates] = useState<Map<number, FlashcardCardState>>(new Map())
  const [dueCards, setDueCards] = useState<DueCard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false)
  const [studyAllCards, setStudyAllCards] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [normalStudyMode, setNormalStudyMode] = useState(false)
  const [normalStudyCards, setNormalStudyCards] = useState<DueCard[]>([])
  const [sessionStats, setSessionStats] = useState({ again: 0, good: 0, easy: 0 })
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const cardStartTime = useRef<number>(Date.now())
  const router = useRouter()

  // --- Logic Helpers ---

  const filterDueCards = (cards: Flashcard[], states: Map<number, FlashcardCardState>): DueCard[] => {
    const now = new Date()
    const due: DueCard[] = []
    
    cards.forEach((card, originalIndex) => {
      const state = states.get(originalIndex)
      const isDue = !state || new Date(state.due_time) <= now
      
      if (isDue) {
        due.push({
          card,
          originalIndex,
          shuffledIndex: due.length
        })
      }
    })
    
    // Shuffle
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[due[i], due[j]] = [due[j], due[i]]
      due[i].shuffledIndex = i
      due[j].shuffledIndex = j
    }
    
    return due
  }

  const loadCardStatesAndFilter = async (flashcardSetId: string, cards: Flashcard[], showAll: boolean = false) => {
    try {
      const states = await flashcardService.getCardStates(flashcardSetId)
      const statesMap = new Map<number, FlashcardCardState>()
      states.forEach(state => statesMap.set(state.flashcard_id, state))
      setCardStates(statesMap)
      
      let due: DueCard[]
      if (showAll) {
        due = cards.map((card, idx) => ({ card, originalIndex: idx, shuffledIndex: idx }))
        // Shuffle
        for (let i = due.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[due[i], due[j]] = [due[j], due[i]]
          due[i].shuffledIndex = i
          due[j].shuffledIndex = j
        }
      } else {
        due = filterDueCards(cards, statesMap)
      }
      
      setDueCards(due)
      
      if (due.length === 0) {
        setIsDone(true)
        const totalReviewed = sessionStats.again + sessionStats.good + sessionStats.easy
        if (totalReviewed > 0) setShowCompletionScreen(true)
      } else {
        setIsDone(false)
        setCurrentCardIndex(0)
        setIsFlipped(false)
        cardStartTime.current = Date.now()
      }
    } catch (error) {
      console.error('Error loading card states:', error)
      // Fallback
      const allDue = cards.map((card, idx) => ({ card, originalIndex: idx, shuffledIndex: idx }))
      setDueCards(allDue)
      setIsDone(false)
    }
  }

  // --- Effects ---

  useEffect(() => {
    const loadStudyData = async () => {
      try {
        setLoading(true)
        setError(null)

        const storedData = sessionStorage.getItem('flashcardStudyModeData')
        if (!storedData) {
          setError('No flashcard data found. Please start a study session first.')
          return
        }

        const parsedData = JSON.parse(storedData)
        let cards = Array.isArray(parsedData.cards) ? [...parsedData.cards] : []
        
        if (cards.length === 0 && parsedData.flashcardId) {
          try {
            const flashcardSet = await flashcardService.getFlashcard(parsedData.flashcardId)
            cards = Array.isArray(flashcardSet.cards) ? [...flashcardSet.cards] : []
            parsedData.cards = cards
            parsedData.cardCount = cards.length
            parsedData.filename = flashcardSet.filename || parsedData.filename
            parsedData.flashcardName = flashcardSet.custom_name || flashcardSet.filename || parsedData.flashcardName
            sessionStorage.setItem('flashcardStudyModeData', JSON.stringify(parsedData))
          } catch (apiError) {
            console.error('Error fetching flashcard from API:', apiError)
            setError('No flashcards found in this set.')
            return
          }
        }
        
        if (cards.length === 0) {
          setError('No flashcards found in this set.')
          return
        }
        
        setStudyData(parsedData)
        setAllCards(cards)
        
        // Init normal study cards
        const shuffledCards = cards.map((card: any, idx: number) => ({ card, originalIndex: idx, shuffledIndex: idx }))
        for (let i = shuffledCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]]
          shuffledCards[i].shuffledIndex = i
          shuffledCards[j].shuffledIndex = j
        }
        setNormalStudyCards(shuffledCards)
        
        if (!normalStudyMode) {
          await loadCardStatesAndFilter(parsedData.flashcardId, cards, studyAllCards)
        }
      } catch (error) {
        console.error('Error loading flashcard study data:', error)
        setError('Failed to load flashcard data.')
      } finally {
        setLoading(false)
      }
    }

    loadStudyData()
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading || error || isDone || showCompletionScreen) return

      // Space to flip
      if (e.code === 'Space') {
        e.preventDefault()
        handleCardClick()
      }

      if (normalStudyMode) {
        // Left/Right arrows for navigation
        if (e.code === 'ArrowLeft') handlePrevious()
        if (e.code === 'ArrowRight') handleNext()
      } else {
        // 1, 2, 3 for ratings (only if flipped)
        if (isFlipped) {
          if (e.key === '1') handleRating('again')
          if (e.key === '2') handleRating('good')
          if (e.key === '3') handleRating('easy')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFlipped, normalStudyMode, loading, error, isDone, showCompletionScreen, currentCardIndex]) // Add dependencies

  // --- Handlers ---

  const handleCardClick = () => {
    if (normalStudyMode) {
      setIsFlipped(!isFlipped)
    } else if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleRating = async (rating: 'again' | 'good' | 'easy') => {
    if (!studyData || dueCards.length === 0) return

    const endTime = Date.now()
    const startTime = cardStartTime.current
    const timeTakenSeconds = (endTime - startTime) / 1000
    const currentDueCard = dueCards[currentCardIndex]
    const originalCardIndex = currentDueCard.originalIndex

    setSessionStats(prev => ({ ...prev, [rating]: prev[rating] + 1 }))

    try {
      await flashcardService.recordReview(studyData.flashcardId, {
        flashcard_id: originalCardIndex,
        rating,
        time_taken: timeTakenSeconds,
      })
    } catch (error) {
      console.error('Failed to record review:', error)
    }

    const updatedDueCards = dueCards.filter((_, idx) => idx !== currentCardIndex)
    
    try {
      await loadCardStatesAndFilter(studyData.flashcardId, allCards, studyAllCards)
    } catch (error) {
      setDueCards(updatedDueCards)
      if (updatedDueCards.length === 0) {
        setIsDone(true)
        setShowCompletionScreen(true)
      } else {
        const newIndex = currentCardIndex < updatedDueCards.length ? currentCardIndex : 0
        setCurrentCardIndex(newIndex)
        setIsFlipped(false)
        cardStartTime.current = Date.now()
      }
    }
  }

  const handleToggleNormalStudyMode = () => {
    const newMode = !normalStudyMode
    setNormalStudyMode(newMode)
    setShowCompletionScreen(false)
    
    if (newMode) {
      setCurrentCardIndex(0)
      setIsFlipped(false)
      setIsDone(false)
    } else {
      setSessionStats({ again: 0, good: 0, easy: 0 })
      if (studyData) {
        loadCardStatesAndFilter(studyData.flashcardId, allCards, studyAllCards)
      }
    }
  }

  const handlePrevious = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setIsFlipped(false)
    }
  }

  const handleNext = () => {
    const cards = normalStudyMode ? normalStudyCards : dueCards
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false)
    }
  }

  const handleClose = () => {
    if (studyData) {
      const editPageData = {
        fileId: studyData.fileId,
        flashcardId: studyData.flashcardId,
        flashcardName: studyData.flashcardName,
        folderName: studyData.folderName,
        cards: allCards,
        cardCount: allCards.length,
        filename: studyData.filename,
        cached: false,
        createdAt: studyData.createdAt
      }
      sessionStorage.setItem('generatedFlashcards', JSON.stringify(editPageData))
      router.push('/flashcard-edit')
    } else {
      router.push('/dashboard')
    }
  }

  // --- Render Helpers ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Preparing your session...</p>
        </div>
      </div>
    )
  }

  if (error || !studyData || allCards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Flashcards</h2>
          <p className="text-gray-600 mb-6">{error || 'No flashcard data available'}</p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-colors font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Completion Screen
  if (!normalStudyMode && showCompletionScreen && (isDone || dueCards.length === 0)) {
    const totalReviewed = sessionStats.again + sessionStats.good + sessionStats.easy
    const maxCount = Math.max(sessionStats.again, sessionStats.good, sessionStats.easy, 1)
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">{studyData.flashcardName}</h1>
          <div className="w-6"></div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Side: Text & Actions */}
            <div>
              <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold mb-4">
                Session Complete
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Great job! 🎉</h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                You've reviewed <span className="font-bold text-gray-900">{totalReviewed}</span> cards. 
                Keep up the momentum to master this topic!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowCompletionScreen(false)
                    setNormalStudyMode(true)
                    setIsDone(false)
                    setCurrentCardIndex(0)
                    setIsFlipped(false)
                  }}
                  className="px-8 py-4 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-all shadow-lg shadow-primary/25 font-bold flex items-center justify-center gap-2 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  Review All Cards
                </button>
                <button
                  onClick={handleClose}
                  className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-bold"
                >
                  Back to Editor
                </button>
              </div>
            </div>

            {/* Right Side: Enhanced Chart */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
               {/* Background decoration */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
               <div className="absolute bottom-0 left-0 w-24 h-24 bg-yellow-400/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

              <h3 className="text-xl font-bold text-gray-900 mb-8 text-center relative z-10">Session Performance</h3>
              
              <div className="flex items-end justify-center gap-6 h-64 relative z-10 px-4">
                {[
                  { label: 'Again', value: sessionStats.again, color: 'from-red-400 to-red-600', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
                  { label: 'Good', value: sessionStats.good, color: 'from-yellow-300 to-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
                  { label: 'Easy', value: sessionStats.easy, color: 'from-green-400 to-green-600', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' }
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center justify-end h-full w-full max-w-[100px] group">
                    <div className={`text-2xl font-bold mb-2 ${stat.text} transition-all transform group-hover:-translate-y-1`}>
                      {stat.value}
                    </div>
                    
                    <div
                        className={`w-full rounded-t-2xl bg-gradient-to-t ${stat.color} shadow-lg transition-all duration-1000 ease-out relative overflow-hidden group-hover:opacity-90`}
                        style={{
                            height: `${Math.max((stat.value / maxCount) * 60, 10)}%`,
                        }}
                    >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    
                    <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${stat.bg} ${stat.text} border ${stat.border}`}>
                        {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // "You're done" message (No cards due)
  if (!normalStudyMode && !showCompletionScreen && (isDone || dueCards.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex items-center gap-3">
             <span className="text-sm text-gray-500">Mode:</span>
             <button
              onClick={handleToggleNormalStudyMode}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Spaced Repetition
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">All caught up!</h2>
            <p className="text-gray-600 mb-8 text-lg">
              You've reviewed all due cards for now. Come back later or switch to normal mode to review everything.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <button
                onClick={async () => {
                  setStudyAllCards(true)
                  setIsDone(false)
                  if (studyData) {
                    await loadCardStatesAndFilter(studyData.flashcardId, allCards, true)
                  }
                }}
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-opacity-90 transition-colors font-medium"
              >
                Review All Anyway
              </button>
              <button
                onClick={handleToggleNormalStudyMode}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Switch to Normal Mode
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const cards = normalStudyMode ? normalStudyCards : dueCards
  const currentDueCard = cards[currentCardIndex]
  const currentCard = currentDueCard?.card

  if (!currentCard) return null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-space-grotesk">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Exit Study Session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
          
          <div>
            <h1 className="text-sm font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">{studyData.flashcardName}</h1>
            <p className="text-xs text-gray-500">
              {currentCardIndex + 1} of {cards.length} cards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => !normalStudyMode && handleToggleNormalStudyMode()}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                normalStudyMode 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => normalStudyMode && handleToggleNormalStudyMode()}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                !normalStudyMode 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Smart
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="p-2 text-gray-400 hover:text-primary hover:bg-purple-50 rounded-lg transition-colors"
            title="Help & Shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 w-full">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
        ></div>
      </div>

      {/* Main Study Area - bottom padding reserves space for fixed footer so card centers above it */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-44 sm:pb-52 overflow-hidden">
        <div className="w-full max-w-3xl perspective-1000 relative">
          
          {/* Card Container */}
          <div
            onClick={handleCardClick}
            className={`
              relative w-full aspect-[1.6/1] min-h-[400px] cursor-pointer transition-transform duration-500 transform-style-preserve-3d
              ${isFlipped ? 'rotate-y-180' : ''}
            `}
            style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
          >
            {/* Front */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center p-8 sm:p-12 hover:shadow-xl transition-shadow">
              <span className="absolute top-6 left-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Question</span>
              <div className="text-center overflow-y-auto max-h-full w-full custom-scrollbar">
                <p className="text-2xl sm:text-3xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {currentCard.front}
                </p>
              </div>
              <div className="absolute bottom-6 text-sm text-gray-400 font-medium animate-pulse">
                Press Space to Flip
              </div>
            </div>

            {/* Back */}
            <div 
              className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-2xl shadow-lg border-2 border-primary flex flex-col items-center justify-center p-8 sm:p-12"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <span className="absolute top-6 left-6 text-xs font-bold text-primary uppercase tracking-wider">Answer</span>
              <div className="text-center overflow-y-auto max-h-full w-full custom-scrollbar">
                <p className="text-2xl sm:text-3xl font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 sm:p-6 z-10">
        <div className="max-w-3xl mx-auto">
          
          {/* Normal Mode Controls */}
          {normalStudyMode && (
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentCardIndex === 0}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span className="hidden sm:inline">Previous</span>
              </button>
              
              <span className="text-sm text-gray-400 font-medium">
                {currentCardIndex + 1} / {cards.length}
              </span>

              <button
                onClick={handleNext}
                disabled={currentCardIndex === cards.length - 1}
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="hidden sm:inline">Next</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {/* Spaced Repetition Controls - same container layout as Normal Mode */}
          {!normalStudyMode && (
            <div className="flex items-center justify-between gap-4">
              {!isFlipped ? (
                <>
                  <div className="flex-1" aria-hidden />
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="flex-1 max-w-sm py-3 px-4 bg-primary text-white text-base font-bold rounded-xl shadow-md hover:bg-opacity-90 transition-all transform active:scale-95"
                  >
                    Show Answer
                  </button>
                  <div className="flex-1" aria-hidden />
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleRating('again')}
                    className="flex-1 py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
                  >
                    <span>Again</span>
                    <span className="text-[10px] font-normal opacity-70">&lt; 1m</span>
                  </button>

                  <button
                    onClick={() => handleRating('good')}
                    className="flex-1 py-3 px-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-700 font-medium hover:bg-yellow-100 transition-colors flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
                  >
                    <span>Good</span>
                    <span className="text-[10px] font-normal opacity-70">10m</span>
                  </button>

                  <button
                    onClick={() => handleRating('easy')}
                    className="flex-1 py-3 px-4 rounded-xl border border-green-200 bg-green-50 text-green-700 font-medium hover:bg-green-100 transition-colors flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
                  >
                    <span>Easy</span>
                    <span className="text-[10px] font-normal opacity-70">30m</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Flip Card</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">Space</kbd>
              </div>
              <div className="border-t border-gray-100 my-2"></div>
              <div className="flex items-center justify-between">
                <span className="text-red-600 font-medium">Again</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">1</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-yellow-600 font-medium">Good</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">2</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-green-600 font-medium">Easy</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">3</kbd>
              </div>
              
              {normalStudyMode && (
                <>
                  <div className="border-t border-gray-100 my-2"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Previous Card</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">←</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Next Card</span>
                    <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-md text-sm font-mono text-gray-500">→</kbd>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Chat */}
      {studyData && ((normalStudyMode && normalStudyCards.length > 0) || (!normalStudyMode && !isDone && dueCards.length > 0)) && (
        <FlashcardChat
          flashcard={currentCard}
          flashcardIndex={currentCardIndex}
          topicName={null}
          allFlashcards={allCards}
          flashcardSetName={studyData.flashcardName}
        />
      )}
    </div>
  )
}
