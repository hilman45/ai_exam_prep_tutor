'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authHelpers } from '../../lib/supabase'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
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

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
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
      // Use Supabase auth for login
      const { data, error } = await authHelpers.signIn(
        formData.email,
        formData.password
      )

      if (error) {
        console.error('Login error:', error)
        
        // Handle specific error cases
        const errorMessage = (error as any)?.message || 'An error occurred during login'
        if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid')) {
          setErrors({ submit: 'Invalid email or password' })
        } else if (errorMessage.includes('email not confirmed')) {
          setErrors({ submit: 'Please check your email and confirm your account' })
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
      console.error('Unexpected login error:', error)
      setErrors({ submit: 'An unexpected error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleLogin = () => {
    // TODO: Add Google OAuth logic here
    console.log('Google login clicked')
    alert('Google login functionality will be added later')
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
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-lg border border-gray-200 relative font-space-grotesk">
        {/* Close Button */}
        <Link href="/" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>

        <div className="p-6">
          {/* Form Title and Subtitle */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-black mb-1 font-space-grotesk">Log in</h1>
            <p className="text-xs text-gray-600 font-space-grotesk">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium font-space-grotesk text-xs">
                Sign up
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-space-grotesk text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-black">Log in with Google</span>
            </button>

            {/* OR Separator */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="text-xs text-gray-500 font-space-grotesk">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
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
                autoFocus
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

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-black hover:text-primary underline font-space-grotesk">
                Forget your password
              </Link>
            </div>

            {/* Log In Button */}
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
                  <span className="text-sm">Logging in...</span>
                </div>
              ) : (
                'Log in'
              )}
            </button>

            {/* General Error Message */}
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
