'use client'

import React from 'react'
import Image from 'next/image'
import { useUserStore } from '@/store/useUserStore'

interface UserProfileCardProps {
  userId?: string
  isCurrentUser?: boolean
  onEdit?: () => void
  compact?: boolean
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  isCurrentUser = false,
  onEdit,
  compact = false,
}) => {
  const profile = useUserStore((state) => state.profile)
  const presence = useUserStore((state) => state.presence)

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        Loading profile...
      </div>
    )
  }

  const isOnline = presence?.is_online ?? false

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {profile.username[0].toUpperCase()}
              </span>
            )}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{profile.username}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {profile.username[0].toUpperCase()}
                </span>
              )}
            </div>
            {/* Online indicator */}
            {isOnline && (
              <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>

          {/* Profile info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile.username}</h2>
            <p className="text-sm text-gray-600 mt-1">{profile.bio || 'No bio yet'}</p>
            <div className="flex items-center gap-2 mt-3">
              <span
                className={`text-xs px-3 py-1 rounded-full ${
                  isOnline
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isOnline ? '🟢 Online' : '⚫ Offline'}
              </span>
              {presence?.last_seen && (
                <span className="text-xs text-gray-500">
                  Last seen: {new Date(presence.last_seen).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit button */}
        {isCurrentUser && onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  )
}
