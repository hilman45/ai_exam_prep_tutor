'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authHelpers } from '../../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      const { error: resetError } = await authHelpers.resetPasswordForEmail(email)

      if (resetError) {
        const msg = (resetError as any)?.message || 'Something went wrong. Please try again.'
        setError(msg)
        return
      }

      setEmailSent(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-space-grotesk">
      {/* Header Logo */}
      <div className="mb-6">
        <Link href="/">
          <img src="/logo.svg" alt="PrepWise" width={240} height={67} className="w-[240px] h-[67px] object-contain" />
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg border border-gray-200 relative font-space-grotesk">
        {/* Close Button */}
        <Link href="/login" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        <div className="p-6">
          {emailSent ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-black mb-2 font-space-grotesk">Check your email</h1>
              <p className="text-xs text-gray-600 font-space-grotesk mb-1">
                We sent a password reset link to
              </p>
              <p className="text-sm font-medium text-black font-space-grotesk mb-4">
                {email}
              </p>
              <p className="text-xs text-gray-500 font-space-grotesk mb-6">
                Click the link in the email to reset your password. If you don't see it, check your spam folder.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 rounded-lg font-medium text-base bg-black text-white hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-lg font-space-grotesk text-center"
              >
                Back to login
              </Link>
              <button
                type="button"
                onClick={() => { setEmailSent(false); setError('') }}
                className="mt-3 text-xs text-gray-500 hover:text-black transition-colors font-space-grotesk underline"
              >
                Didn't receive the email? Try again
              </button>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-black mb-1 font-space-grotesk">Forgot your password?</h1>
                <p className="text-xs text-gray-600 font-space-grotesk">
                  No worries! Enter your email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-space-grotesk text-sm ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    autoFocus
                  />
                  {error && (
                    <p className="mt-1 text-xs text-red-600 font-space-grotesk">{error}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-lg font-medium text-base transition-all duration-200 hover:scale-105 hover:shadow-lg font-space-grotesk ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Sending...</span>
                    </div>
                  ) : (
                    'Send reset link'
                  )}
                </button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link href="/login" className="text-xs text-gray-600 hover:text-primary font-space-grotesk">
                    ← Back to login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
