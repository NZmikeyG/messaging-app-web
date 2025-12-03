'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import { useUserStore } from '@/store/useUserStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { usePresence, useUserPresenceList } from '@/hooks/usePresence'
import { supabase } from '@/lib/supabase/client'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { fetchProfile } = useUserProfile()
  const { profile, setProfile } = useUserStore((state) => ({
    profile: state.profile,
    setProfile: state.setProfile,
  }))
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [userEmail, setUserEmail] = useState<string>('')
  const [workspaceId] = useState('2e95c2c3-10f1-472a-8b51-5aefe3938185')
  const [activeChannelId, setActiveChannelId] = useState<string | undefined>(
    undefined
  )
  const [authChecked, setAuthChecked] = useState(false)

  // Hook: Set presence for current user (CRITICAL - must be called every time userId changes)
  usePresence(userId)

  // Hook: Subscribe to all users' presence changes
  const { presenceList } = useUserPresenceList()

  // CRITICAL: Initialize auth and profile on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔵 Initializing auth and profile...')

        // Get current auth user
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user?.id) {
          console.warn('⚠️ No authenticated user found')
          setAuthChecked(true)
          setMounted(true)
          router.push('/login')
          return
        }

        console.log('✅ Auth user found:', user.id)
        setUserId(user.id)
        setUserEmail(user.email || '')

        // Fetch profile if not already loaded
        if (!profile) {
          console.log('📥 Fetching user profile...')
          await fetchProfile(user.id)
        }

        setAuthChecked(true)
      } catch (error) {
        console.error('❌ Error initializing auth:', error)
        setAuthChecked(true)
      }
    }

    initializeAuth()
  }, [profile, fetchProfile, router]) // ← FIXED: Added router

  useEffect(() => {
    if (authChecked) {
      setMounted(true)
    }
  }, [authChecked])

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelId(channelId)
    router.push(`/dashboard/channel/${channelId}`)
  }

  const handleCreateChannel = () => {
    router.push(`/dashboard/create-channel?workspace=${workspaceId}`)
  }

  if (!mounted || !profile || !userId || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading workspace...</p>
          <p className="text-xs text-gray-500 mt-2">
            Auth: {authChecked ? '✓' : '...'} | Profile: {profile ? '✓' : '...'}
            | Presence: {userId ? '✓' : '...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        workspaceId={workspaceId}
        activeChannelId={activeChannelId}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={handleCreateChannel}
        onNewMessage={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Debug info - remove in production */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 text-xs text-gray-400">
          <span>
            User: {userEmail || profile?.username || 'User'}
          </span>
          <span className="mx-2">•</span>
          <span>Presence: {presenceList.length} users online</span>
          <span className="mx-2">•</span>
          <span>
            Your status:{' '}
            {presenceList.find((p) => p.user_id === userId)?.is_online
              ? '🟢 Online'
              : '🔴 Offline'}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
