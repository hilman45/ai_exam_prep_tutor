'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminService } from '../../../lib/adminService'
import AdminLayout from '../../../components/AdminLayout'

interface User {
  user_id: string
  username: string
  email: string
  full_name: string | null
  is_admin: boolean
  is_active: boolean
  created_at: string
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [actionType, setActionType] = useState<'deactivate' | 'activate' | null>(null)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAdminAndLoadUsers = async () => {
      try {
        const adminStatus = await adminService.checkIsAdmin()
        setIsAdmin(adminStatus)

        if (!adminStatus) {
          setError('Access denied. Admin privileges required.')
          setLoading(false)
          return
        }

        const usersData = await adminService.getUsers()
        setUsers(usersData)
        setFilteredUsers(usersData)
        setError(null)
      } catch (err: any) {
        console.error('Error loading users:', err)
        setError(err.message || 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAndLoadUsers()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.full_name && user.full_name.toLowerCase().includes(query))
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, users])

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setShowDetailsModal(true)
  }

  const handleDeactivate = (user: User) => {
    setSelectedUser(user)
    setActionType('deactivate')
    setShowConfirmModal(true)
  }

  const handleActivate = (user: User) => {
    setSelectedUser(user)
    setActionType('activate')
    setShowConfirmModal(true)
  }

  const confirmAction = async () => {
    if (!selectedUser || !actionType) return

    try {
      setProcessing(true)
      if (actionType === 'deactivate') {
        await adminService.deactivateUser(selectedUser.user_id)
      } else {
        await adminService.activateUser(selectedUser.user_id)
      }

      // Refresh users list
      const updatedUsers = await adminService.getUsers()
      setUsers(updatedUsers)
      setFilteredUsers(updatedUsers)
      setShowConfirmModal(false)
      setSelectedUser(null)
      setActionType(null)
    } catch (err: any) {
      console.error('Error updating user:', err)
      setError(err.message || 'Failed to update user status')
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AdminLayout activeTab="users">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !isAdmin) {
    return (
      <AdminLayout activeTab="users">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="bg-white rounded-lg border-2 border-red-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">{error || 'Admin privileges required to access this page.'}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout activeTab="users">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">User Management</h1>
          <p className="text-gray-600">Manage user accounts and permissions</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                            {user.full_name
                              ? user.full_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2)
                              : user.username[0].toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || user.username}
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.is_admin ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View
                          </button>
                          {user.is_active ? (
                            <button
                              onClick={() => handleDeactivate(user)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Count */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">User Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedUser(null)
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
                <label className="text-sm font-medium text-gray-700">Username</label>
                <p className="mt-1 text-gray-900">@{selectedUser.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{selectedUser.email}</p>
              </div>
              {selectedUser.full_name && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <p className="mt-1 text-gray-900">{selectedUser.full_name}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedUser.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <p className="mt-1">
                  {selectedUser.is_admin ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      User
                    </span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Joined</label>
                <p className="mt-1 text-gray-900">{formatDate(selectedUser.created_at)}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false)
                  setSelectedUser(null)
                }}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && actionType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                actionType === 'deactivate' ? 'bg-red-100' : 'bg-green-100'
              }`}>
                <svg
                  className={`w-6 h-6 ${actionType === 'deactivate' ? 'text-red-600' : 'text-green-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={actionType === 'deactivate'
                      ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                      : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {actionType === 'deactivate' ? 'Deactivate User?' : 'Activate User?'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {actionType === 'deactivate'
                    ? `Are you sure you want to deactivate ${selectedUser.username}? They will not be able to log in.`
                    : `Are you sure you want to activate ${selectedUser.username}? They will be able to log in again.`}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedUser(null)
                  setActionType(null)
                }}
                disabled={processing}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={processing}
                className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                  actionType === 'deactivate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {processing ? 'Processing...' : actionType === 'deactivate' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

