'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { flashcardService, FlashcardCardState } from '@/lib/flashcardService'

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
      // 2. due_time <= now AND is_finished = false
      const isDue = !state || 
        (new Date(state.due_time) <= now && !state.is_finished)
      
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
  const loadCardStatesAndFilter = async (flashcardSetId: string, cards: Flashcard[]) => {
    try {
      // Fetch card states
      const states = await flashcardService.getCardStates(flashcardSetId)
      const statesMap = new Map<number, FlashcardCardState>()
      states.forEach(state => {
        statesMap.set(state.flashcard_id, state)
      })
      setCardStates(statesMap)
      
      // Filter due cards
      const due = filterDueCards(cards, statesMap)
      setDueCards(due)
      
      if (due.length === 0) {
        setIsDone(true)
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
        setStudyData(parsedData)
        
        // Store all cards in original order
        const cards = [...parsedData.cards]
        setAllCards(cards)
        
        // Load card states and filter due cards
        await loadCardStatesAndFilter(parsedData.flashcardId, cards)
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
    if (!isFlipped) {
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
      await loadCardStatesAndFilter(studyData.flashcardId, allCards)
    } catch (error) {
      console.error('Error reloading card states:', error)
      // If error, just remove current card and continue
      setDueCards(updatedDueCards)
      
      if (updatedDueCards.length === 0) {
        setIsDone(true)
      } else {
        // Adjust index if needed
        const newIndex = currentCardIndex < updatedDueCards.length ? currentCardIndex : 0
        setCurrentCardIndex(newIndex)
        setIsFlipped(false)
        cardStartTime.current = Date.now()
      }
    }
  }

  const handleClose = () => {
    router.push('/flashcard-edit')
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

  // Show "You're done for now" message if no cards are due
  if (isDone || dueCards.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900">{studyData.flashcardName}</h1>
          </div>
          <div className="w-6"></div> {/* Spacer for centering */}
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
              All available flashcards have been reviewed. Come back when more cards are due.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Return to Flashcards
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentDueCard = dueCards[currentCardIndex]
  const currentCard = currentDueCard.card

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

        {/* Flashcard Set Name */}
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold text-gray-900">{studyData.flashcardName}</h1>
        </div>

        {/* Card Counter */}
        <div className="text-sm font-medium text-gray-600">
          {currentCardIndex + 1}/{dueCards.length}
        </div>
      </div>

      {/* Main Content - Centered Flashcard */}
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
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

          {/* Action Buttons - Only show after flip */}
          {isFlipped && (
            <div className="mt-8 flex items-center justify-center space-x-4 flex-wrap gap-4">
              {/* Again Button - Red */}
              <button
                onClick={() => handleRating('again')}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                Again (1 min)
              </button>

              {/* Good Button - Yellow */}
              <button
                onClick={() => handleRating('good')}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                Good (3 min)
              </button>

              {/* Easy Button - Green */}
              <button
                onClick={() => handleRating('easy')}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                Easy (10 min)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

