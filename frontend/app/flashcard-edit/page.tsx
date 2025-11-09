'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { flashcardService } from '../../lib/flashcardService'

interface Flashcard {
  front: string
  back: string
}

interface GeneratedFlashcardsData {
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

export default function FlashcardEditPage() {
  const [flashcardsData, setFlashcardsData] = useState<GeneratedFlashcardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCards, setEditedCards] = useState<Flashcard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const loadFlashcardsData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get parameters from URL
        const flashcardId = searchParams.get('flashcardId')
        const folderId = searchParams.get('folderId')
        const folderName = searchParams.get('folderName')

        if (!flashcardId) {
          // Fallback to sessionStorage for backward compatibility
          const storedFlashcards = sessionStorage.getItem('generatedFlashcards')
          if (storedFlashcards) {
            try {
              const parsedFlashcards = JSON.parse(storedFlashcards)
              setFlashcardsData(parsedFlashcards)
              setEditedCards(parsedFlashcards.cards)
              return
            } catch (error) {
              console.error('Error parsing flashcard data:', error)
              setError('Invalid flashcard data. Please generate new flashcards.')
              return
            }
          } else {
            setError('No flashcards specified. Please select flashcards from a folder.')
            return
          }
        }

        // For now, we'll use sessionStorage since the getFlashcard endpoint is not implemented
        // TODO: Implement getFlashcard endpoint in backend
        setError('Flashcard loading from URL parameters not implemented yet. Please use the flashcard generator.')
        return
      } catch (error) {
        console.error('Error loading flashcards:', error)
        setError('Failed to load flashcards. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadFlashcardsData()
  }, [searchParams])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!flashcardsData) return

    setIsSaving(true)
    setError(null)
    try {
      // Save changes to the database
      await flashcardService.updateFlashcard(flashcardsData.flashcardId, editedCards)
      setIsEditing(false)
      
      // Update the flashcard data with edited cards
      setFlashcardsData(prev => prev ? { ...prev, cards: editedCards, cardCount: editedCards.length } : null)
      
      // Update sessionStorage with edited cards
      const updatedFlashcardsData = { ...flashcardsData, cards: editedCards, cardCount: editedCards.length }
      sessionStorage.setItem('generatedFlashcards', JSON.stringify(updatedFlashcardsData))
    } catch (error) {
      console.error('Error saving flashcards:', error)
      setError('Failed to save flashcards. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedCards(flashcardsData?.cards || [])
    setIsEditing(false)
  }

  const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
    const updatedCards = [...editedCards]
    updatedCards[index][field] = value
    setEditedCards(updatedCards)
  }

  const handleStudyFlashcards = () => {
    if (!flashcardsData) return

    // Store flashcard data for study mode
    const studyModeData = {
      ...flashcardsData,
      cards: editedCards
    }
    sessionStorage.setItem('flashcardStudyModeData', JSON.stringify(studyModeData))
    
    // Navigate to flashcard study mode
    router.push('/flashcard-study')
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="flashcards">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading flashcards...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout activeTab="flashcards">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Flashcards</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/flashcard-generator')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Generate New Flashcards
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!flashcardsData) {
    return (
      <DashboardLayout activeTab="flashcards">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-600">No flashcard data available.</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="flashcards">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{flashcardsData.flashcardName}</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>📁 {flashcardsData.folderName}</span>
              <span>📄 {flashcardsData.filename}</span>
              <span>🃏 {flashcardsData.cardCount} flashcards</span>
              {flashcardsData.cached && <span className="text-green-600">✓ Cached</span>}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit Flashcards
                </button>
                <button
                  onClick={handleStudyFlashcards}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Study Flashcards
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

        {/* Flashcards */}
        <div className="space-y-6">
          {editedCards.map((card, cardIndex) => (
            <div key={cardIndex} className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Flashcard {cardIndex + 1}
                </h3>
              </div>

              {/* Front (Question) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question / Front:
                </label>
                {isEditing ? (
                  <textarea
                    value={card.front}
                    onChange={(e) => handleCardChange(cardIndex, 'front', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter question or term..."
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[80px]">
                    <p className="text-gray-900 font-medium">{card.front}</p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Back (Answer) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer / Back:
                </label>
                {isEditing ? (
                  <textarea
                    value={card.back}
                    onChange={(e) => handleCardChange(cardIndex, 'back', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter answer or definition..."
                  />
                ) : (
                  <div className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 min-h-[80px]">
                    <p className="text-gray-900">{card.back}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStudyFlashcards}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
          >
            Study Flashcards
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

