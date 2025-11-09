'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function FlashcardStudyPage() {
  const [studyData, setStudyData] = useState<FlashcardStudyData | null>(null)
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([])
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadStudyData = () => {
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
        
        // Shuffle cards for randomized order
        const cards = [...parsedData.cards]
        for (let i = cards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[cards[i], cards[j]] = [cards[j], cards[i]]
        }
        setShuffledCards(cards)
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

  const handleNextCard = () => {
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false)
    } else {
      // All cards studied, return to edit page
      handleClose()
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

  if (error || !studyData || shuffledCards.length === 0) {
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

  const currentCard = shuffledCards[currentCardIndex]
  const isLastCard = currentCardIndex === shuffledCards.length - 1

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
          {currentCardIndex + 1}/{shuffledCards.length}
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
                onClick={handleNextCard}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                Again (1 min)
              </button>

              {/* Good Button - Yellow */}
              <button
                onClick={handleNextCard}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all duration-200 hover:scale-105 hover:shadow-lg font-medium"
              >
                Good (3 min)
              </button>

              {/* Easy Button - Green */}
              <button
                onClick={handleNextCard}
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

