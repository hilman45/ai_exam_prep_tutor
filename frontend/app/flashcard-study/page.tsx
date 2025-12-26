'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [allCards, setAllCards] = useState<Flashcard[]>([]) // All cards (original order)
  const [cardStates, setCardStates] = useState<Map<number, FlashcardCardState>>(new Map())
  const [dueCards, setDueCards] = useState<DueCard[]>([]) // Only cards that are due
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDone, setIsDone] = useState(false) // True when no cards are due
  const [studyAllCards, setStudyAllCards] = useState(false) // If true, show all cards regardless of due time
  const [showModal, setShowModal] = useState(false) // Modal visibility for info button
  const [normalStudyMode, setNormalStudyMode] = useState(false) // If true, use normal study mode (no spaced repetition)
  const [normalStudyCards, setNormalStudyCards] = useState<DueCard[]>([]) // Cards for normal study mode (fixed sequence)
  const [sessionStats, setSessionStats] = useState({ again: 0, good: 0, easy: 0 }) // Track session statistics
  const [showCompletionScreen, setShowCompletionScreen] = useState(false) // Show completion screen after session
  const cardStartTime = useRef<number>(Date.now())
  const router = useRouter()

  // Helper function to filter due cards based on card states
  const filterDueCards = (
    cards: Flashcard[],
    states: Map<number, FlashcardCardState>
  ): DueCard[] => {
    const now = new Date()
    const due: DueCard[] = []
    
    cards.forEach((card, originalIndex) => {
      const state = states.get(originalIndex)
      
      // Card is due if:
      // 1. No state exists (never reviewed) OR
      // 2. due_time <= now (card is overdue)
      // Note: We ignore is_finished flag since cards should always be reviewable
      // Cards that were marked as finished in the old system will still show if overdue
      const isDue = !state || new Date(state.due_time) <= now
      
      if (isDue) {
        due.push({
          card,
          originalIndex,
          shuffledIndex: due.length // Index in the due cards array
        })
      }
    })
    
    // Shuffle due cards for randomized order
    for (let i = due.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[due[i], due[j]] = [due[j], due[i]]
      // Update shuffledIndex after shuffle
      due[i].shuffledIndex = i
      due[j].shuffledIndex = j
    }
    
    return due
  }

  // Load card states and filter due cards
  const loadCardStatesAndFilter = async (flashcardSetId: string, cards: Flashcard[], showAll: boolean = false) => {
    try {
      // Fetch card states
      const states = await flashcardService.getCardStates(flashcardSetId)
      const statesMap = new Map<number, FlashcardCardState>()
      states.forEach(state => {
        // flashcard_id in card states is the index (0, 1, 2, ...) of the card in the cards array
        statesMap.set(state.flashcard_id, state)
      })
      setCardStates(statesMap)
      
      // Filter due cards (or show all if showAll is true)
      let due: DueCard[]
      if (showAll) {
        // Show all cards if user wants to study everything
        due = cards.map((card, idx) => ({
          card,
          originalIndex: idx,
          shuffledIndex: idx
        }))
        // Shuffle all cards
        for (let i = due.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[due[i], due[j]] = [due[j], due[i]]
          due[i].shuffledIndex = i
          due[j].shuffledIndex = j
        }
      } else {
        due = filterDueCards(cards, statesMap)
      }
      
      console.log(`Filtered ${due.length} ${showAll ? 'total' : 'due'} cards out of ${cards.length} total cards`)
      setDueCards(due)
      
      if (due.length === 0) {
        setIsDone(true)
        // Only show completion screen if we've reviewed at least one card
        const totalReviewed = sessionStats.again + sessionStats.good + sessionStats.easy
        if (totalReviewed > 0) {
          setShowCompletionScreen(true)
        }
      } else {
        setIsDone(false)
        setCurrentCardIndex(0)
        setIsFlipped(false)
        cardStartTime.current = Date.now()
      }
    } catch (error) {
      console.error('Error loading card states:', error)
      // If error, show all cards (fallback behavior)
      const allDue: DueCard[] = cards.map((card, idx) => ({
        card,
        originalIndex: idx,
        shuffledIndex: idx
      }))
      console.log(`Fallback: showing all ${allDue.length} cards`)
      setDueCards(allDue)
      setIsDone(false)
    }
  }

  useEffect(() => {
    const loadStudyData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get flashcard data from sessionStorage
        const storedData = sessionStorage.getItem('flashcardStudyModeData')
        if (!storedData) {
          setError('No flashcard data found. Please start a study session first.')
          return
        }

        const parsedData = JSON.parse(storedData)
        
        // Store all cards in original order - ensure cards is an array
        let cards = Array.isArray(parsedData.cards) ? [...parsedData.cards] : []
        
        // If cards are missing or empty, try to fetch from API
        if (cards.length === 0 && parsedData.flashcardId) {
          console.log('Cards missing from sessionStorage, fetching from API...')
          try {
            const flashcardSet = await flashcardService.getFlashcard(parsedData.flashcardId)
            cards = Array.isArray(flashcardSet.cards) ? [...flashcardSet.cards] : []
            
            // Update parsedData with fetched data
            parsedData.cards = cards
            parsedData.cardCount = cards.length
            parsedData.filename = flashcardSet.filename || parsedData.filename
            parsedData.flashcardName = flashcardSet.custom_name || flashcardSet.filename || parsedData.flashcardName
            
            // Update sessionStorage with complete data
            sessionStorage.setItem('flashcardStudyModeData', JSON.stringify(parsedData))
          } catch (apiError) {
            console.error('Error fetching flashcard from API:', apiError)
            setError('No flashcards found in this set. Please check your flashcard data.')
            return
          }
        }
        
        if (cards.length === 0) {
          setError('No flashcards found in this set. Please check your flashcard data.')
          return
        }
        
        console.log(`Loaded ${cards.length} flashcards for study session`)
        setStudyData(parsedData)
        setAllCards(cards)
        
        // Initialize normal study cards (shuffled once on load)
        const shuffledCards: DueCard[] = cards.map((card, idx) => ({
          card,
          originalIndex: idx,
          shuffledIndex: idx
        }))
        // Shuffle for normal study mode
        for (let i = shuffledCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]]
          shuffledCards[i].shuffledIndex = i
          shuffledCards[j].shuffledIndex = j
        }
        setNormalStudyCards(shuffledCards)
        
        // Load card states and filter due cards (only if not in normal study mode)
        if (!normalStudyMode) {
          await loadCardStatesAndFilter(parsedData.flashcardId, cards, studyAllCards)
        }
      } catch (error) {
        console.error('Error loading flashcard study data:', error)
        setError('Failed to load flashcard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadStudyData()
  }, [])

  const handleCardClick = () => {
    // In normal study mode, allow flipping back and forth
    // In spaced repetition mode, only allow flipping once (from front to back)
    if (normalStudyMode) {
      setIsFlipped(!isFlipped)
    } else if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleRating = async (rating: 'again' | 'good' | 'easy') => {
    if (!studyData || dueCards.length === 0) return

    // Calculate time taken for this card
    const endTime = Date.now()
    const startTime = cardStartTime.current
    const timeTakenSeconds = (endTime - startTime) / 1000

    // Get the original card index from current due card
    const currentDueCard = dueCards[currentCardIndex]
    const originalCardIndex = currentDueCard.originalIndex

    // Update session statistics
    setSessionStats(prev => ({
      ...prev,
      [rating]: prev[rating] + 1
    }))

    // Record the review (silently fail if error - don't interrupt study flow)
    try {
      await flashcardService.recordReview(studyData.flashcardId, {
        flashcard_id: originalCardIndex,
        rating,
        time_taken: timeTakenSeconds,
      })
    } catch (error) {
      console.error('Failed to record review:', error)
      // Continue anyway - don't interrupt the study session
    }

    // Remove the current card from due cards (it's been reviewed and will have new due_time)
    const updatedDueCards = dueCards.filter((_, idx) => idx !== currentCardIndex)
    
    // Reload card states to get updated due_times
    try {
      await loadCardStatesAndFilter(studyData.flashcardId, allCards, studyAllCards)
    } catch (error) {
      console.error('Error reloading card states:', error)
      // If error, just remove current card and continue
      setDueCards(updatedDueCards)
      
      if (updatedDueCards.length === 0) {
        setIsDone(true)
        setShowCompletionScreen(true)
      } else {
        // Adjust index if needed
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
    setShowCompletionScreen(false) // Hide completion screen when switching modes
    
    if (newMode) {
      // Switching to normal study mode
      // Reset to first card
      setCurrentCardIndex(0)
      setIsFlipped(false)
      setIsDone(false)
    } else {
      // Switching back to spaced repetition mode
      // Reset session stats when switching back
      setSessionStats({ again: 0, good: 0, easy: 0 })
      // Reload card states and filter due cards
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

  const handleInfoClick = () => {
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleClose = () => {
    // Try to get folder info from study data to navigate back to folder
    if (studyData) {
      // Store data in format expected by edit page
      const editPageData = {
        fileId: studyData.fileId,
        flashcardId: studyData.flashcardId,
        flashcardName: studyData.flashcardName,
        folderName: studyData.folderName,
        cards: allCards, // Use allCards to ensure we have all cards
        cardCount: allCards.length,
        filename: studyData.filename,
        cached: false,
        createdAt: studyData.createdAt
      }
      sessionStorage.setItem('generatedFlashcards', JSON.stringify(editPageData))
      
      // Navigate to edit page
      router.push('/flashcard-edit')
    } else {
      // Fallback: navigate to dashboard
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  if (error || !studyData || allCards.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Flashcards</h2>
          <p className="text-gray-600 mb-4">{error || 'No flashcard data available'}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Show completion screen if session is finished and we have stats
  if (!normalStudyMode && showCompletionScreen && (isDone || dueCards.length === 0)) {
    const totalReviewed = sessionStats.again + sessionStats.good + sessionStats.easy
    const maxCount = Math.max(sessionStats.again, sessionStats.good, sessionStats.easy, 1)
    
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="relative p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900">{studyData?.flashcardName}</h1>
          </div>
          <div className="w-6"></div> {/* Spacer for centering */}
        </div>

        {/* Completion Screen */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Section - Text and Actions */}
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium mb-2" style={{ color: '#0f5bff' }}>
                {totalReviewed} QUESTIONS PRACTICED
              </p>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Well Done!</h2>
              <p className="text-gray-600 mb-8">
                Strong grasp of the material! A few more practice sessions will perfect your knowledge.
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setShowCompletionScreen(false)
                    setNormalStudyMode(true)
                    setIsDone(false)
                    setCurrentCardIndex(0)
                    setIsFlipped(false)
                  }}
                  className="px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2 flex items-center justify-between"
                  style={{
                    borderColor: '#892CDC',
                    backgroundColor: '#FFFFFF',
                    color: '#892CDC'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#892CDC'
                    e.currentTarget.style.color = '#FFFFFF'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                    e.currentTarget.style.color = '#892CDC'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Study Normally
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-lg font-medium transition-all duration-200 border-2"
                  style={{
                    borderColor: '#E2E8F0',
                    backgroundColor: '#F3F3F3',
                    color: '#191A23'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E2E8F0'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F3F3'
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  Exit
                </button>
              </div>
            </div>

            {/* Right Section - Bar Chart */}
            <div className="flex flex-col justify-center">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Session Performance</h3>
                <div className="flex items-end justify-center gap-6 h-64">
                  {/* Easy Bar - Green */}
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold mb-2" style={{ color: '#22c55e' }}>
                      {sessionStats.easy}
                    </div>
                    <div
                      className="w-16 rounded-t transition-all duration-500"
                      style={{
                        height: `${(sessionStats.easy / maxCount) * 200}px`,
                        backgroundColor: '#22c55e',
                        minHeight: sessionStats.easy > 0 ? '20px' : '0px'
                      }}
                    ></div>
                    <div className="mt-2 text-sm font-medium text-gray-700">Easy</div>
                  </div>

                  {/* Good Bar - Yellow */}
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold mb-2" style={{ color: '#eab308' }}>
                      {sessionStats.good}
                    </div>
                    <div
                      className="w-16 rounded-t transition-all duration-500"
                      style={{
                        height: `${(sessionStats.good / maxCount) * 200}px`,
                        backgroundColor: '#eab308',
                        minHeight: sessionStats.good > 0 ? '20px' : '0px'
                      }}
                    ></div>
                    <div className="mt-2 text-sm font-medium text-gray-700">Good</div>
                  </div>

                  {/* Again (Hard) Bar - Red */}
                  <div className="flex flex-col items-center">
                    <div className="text-lg font-bold mb-2" style={{ color: '#ef4444' }}>
                      {sessionStats.again}
                    </div>
                    <div
                      className="w-16 rounded-t transition-all duration-500"
                      style={{
                        height: `${(sessionStats.again / maxCount) * 200}px`,
                        backgroundColor: '#ef4444',
                        minHeight: sessionStats.again > 0 ? '20px' : '0px'
                      }}
                    ></div>
                    <div className="mt-2 text-sm font-medium text-gray-700">Hard</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show "You're done for now" message if no cards are due (only in spaced repetition mode, but no stats yet)
  if (!normalStudyMode && !showCompletionScreen && (isDone || dueCards.length === 0)) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="relative p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900">{studyData.flashcardName}</h1>
          </div>
          {/* Study Normally Button - Top Right */}
          <button
            onClick={handleToggleNormalStudyMode}
            className="absolute top-4 right-4 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2"
            style={{
              borderColor: normalStudyMode ? '#892CDC' : '#E2E8F0',
              backgroundColor: normalStudyMode ? '#892CDC' : '#FFFFFF',
              color: normalStudyMode ? '#FFFFFF' : '#892CDC'
            }}
            onMouseEnter={(e) => {
              if (!normalStudyMode) {
                e.currentTarget.style.backgroundColor = '#892CDC'
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.transform = 'scale(1.05)'
              }
            }}
            onMouseLeave={(e) => {
              if (!normalStudyMode) {
                e.currentTarget.style.backgroundColor = '#FFFFFF'
                e.currentTarget.style.color = '#892CDC'
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
          >
            {normalStudyMode ? 'Spaced Repetition' : 'Study Normally'}
          </button>
        </div>

        {/* Done Message */}
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 text-primary">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">You're done for now.</h2>
            <p className="text-gray-600 mb-6">
              All due flashcards have been reviewed. You can study all cards again or come back when more cards are due.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={async () => {
                  setStudyAllCards(true)
                  setIsDone(false)
                  // Reload to show all cards
                  if (studyData) {
                    await loadCardStatesAndFilter(studyData.flashcardId, allCards, true)
                  }
                }}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
              >
                Study All Cards
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Return to Flashcards
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get current card based on mode
  const cards = normalStudyMode ? normalStudyCards : dueCards
  const currentDueCard = cards[currentCardIndex]
  const currentCard = currentDueCard?.card

  // Safety check
  if (!currentCard) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No cards available</p>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="relative p-4">
        {/* Close Button - Absolute positioned */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Study Normally Button - Top Right */}
        <button
          onClick={handleToggleNormalStudyMode}
          className="absolute top-4 right-4 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 border-2"
          style={{
            borderColor: normalStudyMode ? '#892CDC' : '#E2E8F0',
            backgroundColor: normalStudyMode ? '#892CDC' : '#FFFFFF',
            color: normalStudyMode ? '#FFFFFF' : '#892CDC'
          }}
          onMouseEnter={(e) => {
            if (!normalStudyMode) {
              e.currentTarget.style.backgroundColor = '#892CDC'
              e.currentTarget.style.color = '#FFFFFF'
              e.currentTarget.style.transform = 'scale(1.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!normalStudyMode) {
              e.currentTarget.style.backgroundColor = '#FFFFFF'
              e.currentTarget.style.color = '#892CDC'
              e.currentTarget.style.transform = 'scale(1)'
            }
          }}
        >
          {normalStudyMode ? 'Spaced Repetition' : 'Study Normally'}
        </button>

        {/* Title - Centered */}
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">{studyData.flashcardName}</h1>
          {normalStudyMode && (
            <p className="text-sm text-gray-500 mt-1">Normal Study Mode</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Progress Counter - Centered (Countup) */}
        <div className="text-center">
          <span className="text-sm font-medium text-gray-700">
            {currentCardIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Main Content - Centered Flashcard */}
      <div className="flex items-center justify-center min-h-[calc(100vh-280px)] p-6 pb-32">
        <div className="w-full max-w-2xl">
          {/* Flashcard */}
          <div
            onClick={handleCardClick}
            className="relative w-full h-96 cursor-pointer perspective-1000"
          >
            <div
              className="relative w-full h-full transition-transform duration-500 transform-style-preserve-3d"
              style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* Front of Card */}
              <div
                className="absolute inset-0 w-full h-full backface-hidden rounded-lg shadow-lg border-2 border-gray-200 flex items-center justify-center p-8 bg-white"
                style={{ transform: 'rotateY(0deg)' }}
              >
                <div className="text-center">
                  <p className="text-2xl font-medium text-gray-900 leading-relaxed">
                    {currentCard.front}
                  </p>
                  {!isFlipped && (
                    <p className="text-sm text-gray-500 mt-4">Click to reveal answer</p>
                  )}
                </div>
              </div>

              {/* Back of Card */}
              <div
                className="absolute inset-0 w-full h-full backface-hidden rounded-lg shadow-lg border-2 border-primary flex items-center justify-center p-8 bg-primary bg-opacity-5"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div className="text-center">
                  <p className="text-2xl font-medium text-gray-900 leading-relaxed">
                    {currentCard.back}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Action Buttons */}
      {/* Normal Study Mode - Always show navigation buttons */}
      {normalStudyMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              {/* Previous Button */}
              <button
                onClick={handlePrevious}
                disabled={currentCardIndex === 0}
                className={`px-6 py-3 border rounded-lg transition-colors font-medium flex items-center gap-2 ${
                  currentCardIndex === 0
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              {/* Exit Button */}
              <button
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Exit
              </button>

              {/* Next Button */}
              <button
                onClick={handleNext}
                disabled={currentCardIndex === cards.length - 1}
                className={`px-6 py-3 border rounded-lg transition-colors font-medium flex items-center gap-2 ${
                  currentCardIndex === cards.length - 1
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spaced Repetition Mode - Only show after flip */}
      {!normalStudyMode && isFlipped && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-2xl mx-auto">
            {/* Spaced Repetition Mode - Rating Buttons */}
            <>
                {/* Buttons */}
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {/* Again Button */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">&lt;1m</span>
                    <button
                      onClick={() => handleRating('again')}
                      className="px-14 py-3 border border-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2'
                        e.currentTarget.style.borderColor = '#ef4444'
                        e.currentTarget.style.color = '#dc2626'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                        e.currentTarget.style.borderColor = '#d1d5db'
                        e.currentTarget.style.color = '#374151'
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Again
                    </button>
                  </div>

                  {/* Good Button */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">10min</span>
                    <button
                      onClick={() => handleRating('good')}
                      className="px-14 py-3 border border-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef9c3'
                        e.currentTarget.style.borderColor = '#eab308'
                        e.currentTarget.style.color = '#ca8a04'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                        e.currentTarget.style.borderColor = '#d1d5db'
                        e.currentTarget.style.color = '#374151'
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Good
                    </button>
                  </div>

                  {/* Easy Button */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">30min</span>
                    <button
                      onClick={() => handleRating('easy')}
                      className="px-14 py-3 border border-gray-300 text-gray-700 rounded-lg transition-all duration-200 font-medium flex items-center gap-2"
                      style={{
                        backgroundColor: '#ffffff'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dcfce7'
                        e.currentTarget.style.borderColor = '#22c55e'
                        e.currentTarget.style.color = '#16a34a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff'
                        e.currentTarget.style.borderColor = '#d1d5db'
                        e.currentTarget.style.color = '#374151'
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Easy
                    </button>
                  </div>
                </div>

                {/* Info Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleInfoClick}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    What do these buttons mean?
                  </button>
                </div>
            </>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">What do these buttons mean?</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 mb-6">
              {/* Again */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">&lt;1m</span>
                  <h4 className="font-semibold text-gray-900">Again</h4>
                </div>
                <p className="text-sm text-gray-600">
                  This card will be shown again in less than 1 minute. Use this option if you didn't remember the answer or need more practice with this card.
                </p>
              </div>

              {/* Good */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">10min</span>
                  <h4 className="font-semibold text-gray-900">Good</h4>
                </div>
                <p className="text-sm text-gray-600">
                  This card will be shown again in 10 minutes. Use this option if you remembered the answer correctly but want to review it again soon.
                </p>
              </div>

              {/* Easy */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">30min</span>
                  <h4 className="font-semibold text-gray-900">Easy</h4>
                </div>
                <p className="text-sm text-gray-600">
                  This card will be shown again in 30 minutes. Use this option if you remembered the answer easily and feel confident about it.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard Chat - Always available */}
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

