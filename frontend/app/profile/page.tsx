'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, authHelpers } from '../../lib/supabase'
import DashboardLayout from '../../components/DashboardLayout'

interface UserProfile {
  user_id: string
  username: string
  full_name: string | null
  profile_picture_url: string | null
  email: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [editingFullName, setEditingFullName] = useState(false)
  const [editingUsername, setEditingUsername] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      setLoading(true)
      const { user: currentUser, error: userError } = await authHelpers.getCurrentUser()
      
      if (userError || !currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Load profile from user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError)
      }

      const userProfile: UserProfile = {
        user_id: currentUser.id,
        username: profileData?.username || 'User',
        full_name: profileData?.full_name || null,
        profile_picture_url: profileData?.profile_picture_url || null,
        email: currentUser.email || '',
        created_at: currentUser.created_at || new Date().toISOString()
      }

      setProfile(userProfile)
      setFullName(userProfile.full_name || '')
      setUsername(userProfile.username)
      setProfilePicture(userProfile.profile_picture_url)
    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }

      setProfilePictureFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicture(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `profile-pictures/${fileName}`

      // Try to upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        // If bucket doesn't exist or upload fails, use data URL as fallback
        // Note: For production, set up Supabase Storage bucket named 'avatars'
        console.warn('Storage upload failed, using data URL:', uploadError.message)
        
        // Convert to data URL (only if file is small enough)
        if (file.size < 2 * 1024 * 1024) { // 2MB limit for data URLs
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
        } else {
          throw new Error('File too large for data URL. Please set up Supabase Storage.')
        }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading profile picture:', error)
      // Return null to indicate failure
      return null
    }
  }

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      let profilePictureUrl = profilePicture

      // Upload profile picture if changed
      if (profilePictureFile) {
        const uploadedUrl = await uploadProfilePicture(profilePictureFile)
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl
        } else {
          // If upload fails and we don't have a data URL, show error
          if (!profilePicture || !profilePicture.startsWith('data:')) {
            throw new Error('Failed to upload profile picture. Please try again or set up Supabase Storage.')
          }
          // Use existing data URL as fallback
          profilePictureUrl = profilePicture
        }
      }

      // Update user_profiles table
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim() || null,
          username: username.trim(),
          profile_picture_url: profilePictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        throw updateError
      }

      setEditingFullName(false)
      setEditingUsername(false)
      setProfilePictureFile(null)
      setSuccess('Profile updated successfully!')
      
      // Reload profile data
      await loadUserData()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Note: Supabase client SDK doesn't allow users to delete their own accounts
      // This requires a backend endpoint with admin privileges or service role key
      // For MVP, we'll show a message that this feature requires backend implementation
      
      // Option 1: Call backend endpoint if available
      // const response = await fetch('/api/delete-account', { method: 'DELETE' })
      
      // Option 2: For now, show helpful message
      setError('Account deletion requires backend implementation. Please contact support or implement a backend endpoint with admin privileges.')
      setSaving(false)
      setDeleteModalOpen(false)
      setDeleteConfirmText('')
      
      // TODO: Implement backend endpoint /api/delete-account that:
      // 1. Verifies the user's identity
      // 2. Uses Supabase Admin API to delete the user
      // 3. This will cascade delete all related data due to ON DELETE CASCADE
      
    } catch (error: any) {
      console.error('Error deleting account:', error)
      setError(error.message || 'Failed to delete account')
      setSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.trim().split(' ')
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name[0].toUpperCase()
    }
    return email[0].toUpperCase()
  }

  if (loading) {
    return (
      <DashboardLayout activeTab="profile">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!profile) {
    return (
      <DashboardLayout activeTab="profile">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="profile">
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Profile & Settings</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* 1. Basic User Information */}
        <div className="bg-white rounded-lg border-2 border-black p-6 mb-6 transition-all duration-200 hover:shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Basic User Information</h2>
          
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-300">
                    {getInitials(profile.full_name, profile.email)}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-opacity-90 transition-colors border-2 border-white"
                  title="Change profile picture"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm text-gray-600">Click the camera icon to change your profile picture</p>
                <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              {editingFullName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                  <button
                    onClick={() => {
                      setFullName(profile.full_name || '')
                      setEditingFullName(false)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-800">{profile.full_name || 'Not set'}</p>
                  <button
                    onClick={() => setEditingFullName(true)}
                    className="text-primary hover:text-opacity-80 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <p className="text-gray-800">{profile.email}</p>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              {editingUsername ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter username"
                  />
                  <button
                    onClick={() => {
                      setUsername(profile.username)
                      setEditingUsername(false)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-800">@{profile.username}</p>
                  <button
                    onClick={() => setEditingUsername(true)}
                    className="text-primary hover:text-opacity-80 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Joined Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joined Date</label>
              <p className="text-gray-800">{formatDate(profile.created_at)}</p>
            </div>

            {/* Save Button */}
            {(editingFullName || editingUsername || profilePictureFile) && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Account Settings */}
        <div className="bg-white rounded-lg border-2 border-black p-6 mb-6 transition-all duration-200 hover:shadow-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Account Settings</h2>
          
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Manage your account settings and preferences. Changes to your profile information are saved above.
            </p>
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Account
              </button>
              <p className="text-xs text-gray-500 mt-2">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Account</h2>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete your account? This action cannot be undone and will permanently delete:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
              <li>All your uploaded files and materials</li>
              <li>All generated summaries, quizzes, and flashcards</li>
              <li>Your profile and preferences</li>
              <li>All your study progress and analytics</li>
            </ul>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setDeleteConfirmText('')
                  setError(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || saving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

