'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

const categories = [
  { value: 'bugs', label: 'Bugs', icon: '🐛' },
  { value: 'feature_request', label: 'Feature Request', icon: '💡' },
  { value: 'uploading_files', label: 'Uploading Files', icon: '📤' },
  { value: 'notes_ai', label: 'Notes AI', icon: '📝' },
  { value: 'flashcards_ai', label: 'Flashcards AI', icon: '🃏' },
  { value: 'quizfetch', label: 'QuizFetch', icon: '🎯' },
]

const ratings = [
  { value: 'good', label: 'Good', icon: '👍' },
  { value: 'bad', label: 'Bad', icon: '👎' },
]

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedRating, setSelectedRating] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  if (!isOpen) return null

  const handleSubmit = async () => {
    // Validation
    if (!feedbackText.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please enter your feedback' })
      return
    }

    if (!selectedCategory) {
      setSubmitMessage({ type: 'error', text: 'Please select a category' })
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setSubmitMessage({ type: 'error', text: 'You must be logged in to submit feedback' })
        setIsSubmitting(false)
        return
      }

      // Insert feedback
      const { error: insertError } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_text: feedbackText.trim(),
          category: selectedCategory,
          rating: selectedRating,
          status: 'pending'
        })

      if (insertError) {
        console.error('Error submitting feedback:', insertError)
        setSubmitMessage({ type: 'error', text: 'Failed to submit feedback. Please try again.' })
      } else {
        setSubmitMessage({ type: 'success', text: 'Thank you! Your feedback has been submitted.' })
        
        // Reset form after 2 seconds and close
        setTimeout(() => {
          setFeedbackText('')
          setSelectedCategory(null)
          setSelectedRating(null)
          setSubmitMessage(null)
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setSubmitMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFeedbackText('')
      setSelectedCategory(null)
      setSelectedRating(null)
      setSubmitMessage(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 font-space-grotesk">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-dark">Feedback</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Please explain in detail the feedback or issue you are having.
            </p>

            {/* Textarea */}
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Please explain in detail the feedback or issue you are having"
              className="w-full min-h-[120px] p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              disabled={isSubmitting}
            />
          </div>

          {/* Rating Buttons */}
          <div className="flex gap-3">
            {ratings.map((rating) => (
              <button
                key={rating.value}
                onClick={() => setSelectedRating(rating.value)}
                disabled={isSubmitting}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                  selectedRating === rating.value
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="text-lg">{rating.icon}</span>
                <span className="font-medium text-sm">{rating.label}</span>
              </button>
            ))}
          </div>

          {/* Category Selection */}
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Please select the feature you are having issues with:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border transition-all ${
                    selectedCategory === category.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-base">{category.icon}</span>
                  <span className="text-xs font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Message */}
          {submitMessage && (
            <div
              className={`p-4 rounded-xl text-sm ${
                submitMessage.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {submitMessage.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Feedback</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

