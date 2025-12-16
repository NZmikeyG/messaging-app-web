import React, { useState, useEffect } from 'react'
import { getAllUsers } from '@/lib/supabase/users'
import type { Profile } from '@/types'

interface CreateChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateChannel: (
    name: string,
    description?: string,
    isPrivate?: boolean,
    members?: string[] // List of user IDs
  ) => Promise<void>
  parentChannelId?: string | null
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
  parentChannelId,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User Selection
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true)
      getAllUsers().then(data => {
        setUsers(data)
        setLoadingUsers(false)
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Channel name is required')
      return
    }

    try {
      setIsLoading(true)
      await onCreateChannel(
        name,
        description || undefined,
        isPrivate,
        Array.from(selectedUsers)
      )
      resetForm()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create channel'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setIsPrivate(false)
    setSelectedUsers(new Set())
    setError(null)
  }

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 flex flex-col max-h-[90vh]">
        <h2 className="text-xl font-bold mb-1">
          {parentChannelId ? 'Create Sub-Channel' : 'Create New Channel'}
        </h2>
        {parentChannelId && (
          <p className="text-xs text-gray-500 mb-4">Under parent ID: {parentChannelId}</p>
        )}
        {!parentChannelId && <div className="mb-4" />}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-2">
          {/* Channel Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={parentChannelId ? "e.g. project-updates" : "e.g. general"}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3 py-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              rows={2}
              disabled={isLoading}
            />
          </div>

          {/* Private Toggle */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4"
              disabled={isLoading}
            />
            <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700 cursor-pointer">
              Make this a private channel
            </label>
          </div>

          {/* Member Selection (Only for Private) */}
          {/* Even if public, maybe we want to add members? But mainly for private. */}
          {/* User requested: "remains private until a user gives another user access... this would require a field to tickbox each user" */}
          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Members {isPrivate ? '(Required for Private)' : '(Optional)'}
            </label>
            <div className="border border-gray-200 rounded max-h-40 overflow-y-auto">
              {loadingUsers ? (
                <div className="p-4 text-center text-gray-400 text-sm">Loading users...</div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="w-4 h-4"
                    />
                    <div className="text-sm">
                      <div className="font-medium text-gray-800">{user.username}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              resetForm()
              onClose()
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium transition disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded font-medium transition disabled:opacity-50"
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  )
}