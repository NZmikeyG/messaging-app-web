'use client'

import React, { useState, useEffect } from 'react'
import { updateUserProfile } from '@/lib/supabase/users'
import { useUserStore } from '@/store/useUserStore'

interface EditProfileModalProps {
    isOpen: boolean
    onClose: () => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
    const { profile, fetchProfile } = useUserStore()
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && profile) {
            setUsername(profile.username || '')
            setAvatarUrl(profile.avatar_url || '')
            setError(null)
        }
    }, [isOpen, profile])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return

        try {
            setLoading(true)
            await updateUserProfile(profile.id, {
                username: username.trim(),
                avatar_url: avatarUrl.trim() || undefined
            })
            await fetchProfile(profile.id) // Reload store
            onClose()
        } catch (err) {
            console.error(err)
            setError('Failed to update profile')
        } finally {
            setLoading(false)
        }
    }

    const generateRandomAvatar = () => {
        const seed = Math.random().toString(36).substring(7)
        setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Edit Profile</h2>

                {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>}

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                            placeholder="Display Name"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={e => setAvatarUrl(e.target.value)}
                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                                placeholder="https://..."
                            />
                            <button
                                type="button"
                                onClick={generateRandomAvatar}
                                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-700"
                                title="Generate Random Avatar"
                            >
                                🎲
                            </button>
                        </div>
                        {avatarUrl && (
                            <div className="mt-2 flex justify-center">
                                <img src={avatarUrl} alt="Preview" className="w-16 h-16 rounded-full border border-gray-200" />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
