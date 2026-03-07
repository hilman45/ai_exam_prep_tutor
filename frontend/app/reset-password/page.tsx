'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authHelpers, supabase } from '../../lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handlePasswordRecovery = async () => {
      // Supabase automatically handles the token exchange from the URL hash
      // when using PKCE flow. We just need to listen for the session.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsValidSession(true)
            setIsLoading(false)
          } else if (event === 'SIGNED_IN' && session) {
            setIsValidSession(true)
            setIsLoading(false)
          }
        }
      )

      // Also check if there's already a session (in case the event already fired)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      }
      setIsLoading(false)

      return () => {
        subscription.unsubscribe()
      }
    }

    handlePasswordRecovery()
  }, [])

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { error } = await authHelpers.updatePassword(password)

      if (error) {
        const msg = (error as any)?.message || 'Failed to update password. Please try again.'
        setErrors({ submit: msg })
        return
      }

      setIsSuccess(true)
    } catch {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-space-grotesk">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-gray-600 font-space-grotesk">Verifying your reset link...</p>
      </div>
    )
  }

  // Invalid / expired link
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-space-grotesk">
        <div className="mb-6">
          <Link href="/">
            <img src="/logo.svg" alt="PrepWise" width={240} height={67} className="w-[240px] h-[67px] object-contain" />
          </Link>
        </div>

        <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg border border-gray-200 font-space-grotesk">
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-black mb-2 font-space-grotesk">Invalid or expired link</h1>
            <p className="text-xs text-gray-600 font-space-grotesk mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block w-full py-3 rounded-lg font-medium text-base bg-black text-white hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-lg font-space-grotesk text-center"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-space-grotesk">
        <div className="mb-6">
          <Link href="/">
            <img src="/logo.svg" alt="PrepWise" width={240} height={67} className="w-[240px] h-[67px] object-contain" />
          </Link>
        </div>

        <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg border border-gray-200 font-space-grotesk">
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-black mb-2 font-space-grotesk">Password updated!</h1>
            <p className="text-xs text-gray-600 font-space-grotesk mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-3 rounded-lg font-medium text-base bg-black text-white hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-lg font-space-grotesk text-center"
            >
              Go to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
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
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-black mb-1 font-space-grotesk">Set a new password</h1>
            <p className="text-xs text-gray-600 font-space-grotesk">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '', submit: '' })) }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-16 font-space-grotesk text-sm ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter new password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                  <span className="text-xs">{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 font-space-grotesk">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: '', submit: '' })) }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-16 font-space-grotesk text-sm ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showConfirmPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    )}
                  </svg>
                  <span className="text-xs">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 font-space-grotesk">{errors.confirmPassword}</p>
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
                  <span className="text-sm">Updating...</span>
                </div>
              ) : (
                'Reset password'
              )}
            </button>

            {/* General Error */}
            {errors.submit && (
              <div className="text-center">
                <p className="text-xs text-red-600 font-space-grotesk">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
