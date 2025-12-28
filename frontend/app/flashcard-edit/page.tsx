'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import { flashcardService } from '../../lib/flashcardService'
import FlashcardEditChat from '../../components/FlashcardEditChat'

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
  const [showAddFlashcardForm, setShowAddFlashcardForm] = useState(false)
  const [showAIChat, setShowAIChat] = useState(false)
  
  // Auto-open chat when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setShowAIChat(false) // Start closed, user can open it
    }
  }, [isEditing])
  const [aiGeneratedFlashcards, setAiGeneratedFlashcards] = useState<Flashcard[] | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedFlashcardForChat, setSelectedFlashcardForChat] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // New flashcard form state
  const [newFlashcard, setNewFlashcard] = useState({
    front: '',
    back: ''
  })

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
          // First try generatedFlashcards (from edit/generator flow)
          let storedFlashcards = sessionStorage.getItem('generatedFlashcards')
          
          // If not found, try flashcardStudyModeData (from study flow)
          if (!storedFlashcards) {
            storedFlashcards = sessionStorage.getItem('flashcardStudyModeData')
          }
          
          if (storedFlashcards) {
            try {
              const parsedFlashcards = JSON.parse(storedFlashcards)
              // Ensure cards is an array
              const cards = Array.isArray(parsedFlashcards.cards) ? parsedFlashcards.cards : []
              
              if (cards.length === 0) {
                setError('No flashcards found in this set. Please generate new flashcards.')
                return
              }
              
              setFlashcardsData(parsedFlashcards)
              setEditedCards(cards)
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
    setSelectedFlashcardForChat(null)
  }

  const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
    const updatedCards = [...editedCards]
    updatedCards[index][field] = value
    setEditedCards(updatedCards)
  }

  const handleDeleteFlashcard = (index: number) => {
    if (window.confirm('Are you sure you want to delete this flashcard?')) {
      const updatedCards = editedCards.filter((_, i) => i !== index)
      setEditedCards(updatedCards)
      // If deleted flashcard was selected, deselect it
      if (selectedFlashcardForChat === index) {
        setSelectedFlashcardForChat(null)
      } else if (selectedFlashcardForChat !== null && selectedFlashcardForChat > index) {
        // Adjust selection index if a flashcard before the selected one was deleted
        setSelectedFlashcardForChat(selectedFlashcardForChat - 1)
      }
    }
  }

  const handleAddFlashcard = () => {
    if (!newFlashcard.front.trim() || !newFlashcard.back.trim()) {
      alert('Please enter both front and back of the flashcard')
      return
    }

    const flashcardToAdd: Flashcard = {
      front: newFlashcard.front.trim(),
      back: newFlashcard.back.trim()
    }

    setEditedCards([...editedCards, flashcardToAdd])
    setNewFlashcard({
      front: '',
      back: ''
    })
    setShowAddFlashcardForm(false)
  }

  const handleAIGeneratedFlashcards = (flashcards: Flashcard[]) => {
    setAiGeneratedFlashcards(flashcards)
    setShowPreviewModal(true)
  }

  const handleApplyAIGeneratedFlashcards = (replace: boolean) => {
    if (!aiGeneratedFlashcards || aiGeneratedFlashcards.length === 0) return

    // If a specific flashcard is selected, only modify that flashcard
    if (selectedFlashcardForChat !== null && selectedFlashcardForChat !== undefined) {
      const selectedIndex = selectedFlashcardForChat
      
      if (replace) {
        // Replace only the selected flashcard with the first AI-generated flashcard
        const updatedCards = [...editedCards]
        updatedCards[selectedIndex] = aiGeneratedFlashcards[0]
        setEditedCards(updatedCards)
        // Deselect after replacement
        setSelectedFlashcardForChat(null)
      } else {
        // Insert new flashcard(s) after the selected flashcard
        const updatedCards = [...editedCards]
        updatedCards.splice(selectedIndex + 1, 0, ...aiGeneratedFlashcards)
        setEditedCards(updatedCards)
      }
    } else {
      // No flashcard selected - apply to all flashcards
      if (replace) {
        setEditedCards(aiGeneratedFlashcards)
      } else {
        setEditedCards([...editedCards, ...aiGeneratedFlashcards])
      }
    }

    setAiGeneratedFlashcards(null)
    setShowPreviewModal(false)
    setShowAIChat(false)
  }

  const handleCancelPreview = () => {
    setAiGeneratedFlashcards(null)
    setShowPreviewModal(false)
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
          {editedCards.map((card, cardIndex) => {
            const isSelectedForChat = selectedFlashcardForChat === cardIndex
            
            return (
              <div 
                key={cardIndex} 
                id={`flashcard-${cardIndex}`}
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
                      Flashcard {cardIndex + 1}
                      {isSelectedForChat && (
                        <span className="ml-2 text-primary text-sm">💬 Getting Help</span>
                      )}
                    </h3>
                  </div>
                  {isEditing && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          if (selectedFlashcardForChat === cardIndex) {
                            setSelectedFlashcardForChat(null)
                          } else {
                            setSelectedFlashcardForChat(cardIndex)
                            setShowAIChat(true)
                            // Scroll to flashcard when selected
                            setTimeout(() => {
                              const flashcardElement = document.getElementById(`flashcard-${cardIndex}`)
                              if (flashcardElement) {
                                flashcardElement.scrollIntoView({ 
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
                        onClick={() => handleDeleteFlashcard(cardIndex)}
                        className="text-red-500 hover:text-red-700 transition-colors p-1"
                        title="Delete flashcard"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
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
            )
          })}

          {/* Add Flashcard Form */}
          {isEditing && showAddFlashcardForm && (
            <div className="bg-white border-2 border-primary rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add New Flashcard</h3>
                <button
                  onClick={() => {
                    setShowAddFlashcardForm(false)
                    setNewFlashcard({
                      front: '',
                      back: ''
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
                    Front / Question:
                  </label>
                  <textarea
                    value={newFlashcard.front}
                    onChange={(e) => setNewFlashcard({ ...newFlashcard, front: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter question or term..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Back / Answer:
                  </label>
                  <textarea
                    value={newFlashcard.back}
                    onChange={(e) => setNewFlashcard({ ...newFlashcard, back: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Enter answer or definition..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowAddFlashcardForm(false)
                      setNewFlashcard({
                        front: '',
                        back: ''
                      })
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFlashcard}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                  >
                    Add Flashcard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Flashcard Button - at bottom of flashcards */}
          {isEditing && !showAddFlashcardForm && (
            <button
              onClick={() => setShowAddFlashcardForm(true)}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary hover:text-primary hover:bg-purple-50 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Add New Flashcard</span>
            </button>
          )}
        </div>

        {/* Footer Actions - Only show Study button when not editing */}
        {!isEditing && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleStudyFlashcards}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Study Flashcards
            </button>
          </div>
        )}

        {/* AI Chat Panel - Always visible when in edit mode */}
        {isEditing && flashcardsData && (
          <FlashcardEditChat
            currentFlashcards={editedCards}
            flashcardName={flashcardsData.flashcardName}
            filename={flashcardsData.filename}
            onClose={() => setShowAIChat(false)}
            onFlashcardsGenerated={handleAIGeneratedFlashcards}
            isOpen={showAIChat}
            onToggle={() => setShowAIChat(!showAIChat)}
            selectedFlashcard={selectedFlashcardForChat !== null ? editedCards[selectedFlashcardForChat] : null}
            selectedFlashcardIndex={selectedFlashcardForChat}
          />
        )}

        {/* Preview Modal for AI Generated Flashcards */}
        {showPreviewModal && aiGeneratedFlashcards && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCancelPreview}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Preview AI-Generated Flashcards</h3>
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
                  {selectedFlashcardForChat !== null && selectedFlashcardForChat !== undefined ? (
                    <>
                      <strong>1</strong> flashcard generated for <strong>Flashcard {selectedFlashcardForChat + 1}</strong>. 
                      Choose how you'd like to apply it:
                    </>
                  ) : (
                    <>
                      <strong>{aiGeneratedFlashcards.length}</strong> new flashcard{aiGeneratedFlashcards.length !== 1 ? 's' : ''} generated. 
                      Choose how you'd like to apply them:
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                {selectedFlashcardForChat !== null && selectedFlashcardForChat !== undefined && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This will only affect <strong>Flashcard {selectedFlashcardForChat + 1}</strong> (the highlighted flashcard).
                    </p>
                  </div>
                )}
                {aiGeneratedFlashcards.map((flashcard, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {selectedFlashcardForChat !== null && selectedFlashcardForChat !== undefined
                          ? `Replacement for Flashcard ${selectedFlashcardForChat + 1}`
                          : `Flashcard ${index + 1}`}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm p-2 bg-white rounded">
                        <span className="font-medium text-gray-700">Front: </span>
                        <span className="text-gray-900">{flashcard.front}</span>
                      </div>
                      <div className="text-sm p-2 bg-white rounded">
                        <span className="font-medium text-gray-700">Back: </span>
                        <span className="text-gray-900">{flashcard.back}</span>
                      </div>
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
                {selectedFlashcardForChat !== null && selectedFlashcardForChat !== undefined ? (
                  <>
                    <button
                      onClick={() => handleApplyAIGeneratedFlashcards(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      Add After This Flashcard
                    </button>
                    <button
                      onClick={() => handleApplyAIGeneratedFlashcards(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Replace This Flashcard
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApplyAIGeneratedFlashcards(false)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                      Add to Current Flashcards
                    </button>
                    <button
                      onClick={() => handleApplyAIGeneratedFlashcards(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Replace Current Flashcards
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
