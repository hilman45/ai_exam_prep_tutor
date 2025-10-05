'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authHelpers } from '../../lib/supabase'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Use Supabase auth for signup
      const { data, error } = await authHelpers.signUp(
        formData.email,
        formData.password,
        formData.username
      )

      if (error) {
        console.error('Signup error:', error)
        
        // Handle specific error cases
        const errorMessage = (error as any)?.message || 'An error occurred during signup'
        if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
          setErrors({ submit: 'User with this email already exists' })
        } else if (errorMessage.includes('password')) {
          setErrors({ submit: 'Password does not meet requirements' })
        } else {
          setErrors({ submit: errorMessage })
        }
        return
      }

      if (data?.user) {
        // Store tokens if available
        if (data.session?.access_token && data.session?.refresh_token) {
          authHelpers.storeTokens(data.session.access_token, data.session.refresh_token)
        }
        
        // Redirect to dashboard
        router.push('/dashboard')
      }
      
    } catch (error) {
      console.error('Unexpected signup error:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 font-space-grotesk">
      {/* Header Logo */}
      <div className="mb-6">
        <Link href="/" className="text-4xl font-bold font-space-grotesk">
          <span className="text-black">Prep</span>
          <span className="text-primary">Wise</span>
        </Link>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 relative font-space-grotesk">
        {/* Close Button */}
        <Link href="/" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        <div className="p-6">
          {/* Form Title and Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-black mb-1 font-space-grotesk">Create an account</h1>
            <p className="text-xs text-gray-600 font-space-grotesk">Join PrepWise and start learning smarter today.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-space-grotesk text-sm ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your username"
                autoFocus
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-600 font-space-grotesk">{errors.username}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-space-grotesk text-sm ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 font-space-grotesk">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-16 font-space-grotesk text-sm ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-black mb-1 font-space-grotesk">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-16 font-space-grotesk text-sm ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
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

            {/* Login Prompt */}
            <div className="text-center">
              <p className="text-xs text-gray-600 font-space-grotesk">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium font-space-grotesk text-xs">
                  Log in
                </Link>
              </p>
            </div>

            {/* Sign Up Button */}
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
                  <span className="text-sm">Creating account...</span>
                </div>
              ) : (
                'Sign up'
              )}
            </button>

            {/* General Error Message */}
            {errors.submit && (
              <div className="text-center">
                <p className="text-xs text-red-600 font-space-grotesk">{errors.submit}</p>
              </div>
            )}

            {/* Terms and Privacy Policy */}
            <div className="text-center">
              <p className="text-xs text-gray-600 font-space-grotesk">
                By creating an account, you agree to the{' '}
                <Link href="/terms" className="underline hover:text-primary font-space-grotesk text-xs">
                  Terms of use
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-primary font-space-grotesk text-xs">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
