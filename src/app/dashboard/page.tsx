'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserProfile } from '@/hooks/useUserProfile'
import { usePresence } from '@/hooks/usePresence'
import { useUserStore } from '@/store/useUserStore'
import { UserProfileCard } from '@/components/profile/UserProfileCard'
import { EditProfileModal } from '@/components/profile/EditProfileModal'
import { ChannelList } from '@/components/ChannelList'

function DashboardContent() {
  const router = useRouter()
  const { fetchProfile } = useUserProfile()
  const [showEditModal, setShowEditModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const profile = useUserStore((state) => state.profile)

  // Call presence hook when userId is available
  usePresence(userId)

  // Fetch session and profile on mount
  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setIsLoading(true)

        // Dynamic import - only in browser
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        // Session check
        const currentUserId = data?.session?.user?.id
        if (!currentUserId) {
          router.push('/auth/login')
          return
        }

        setUserId(currentUserId)
        await fetchProfile(currentUserId)
      } catch {
        // Any error falls back to auth redirect for security
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }
    
    setMounted(true)
    initializeProfile()
  }, [fetchProfile, router])

  // Show loading spinner during session/profile load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If not authenticated or failed to load profile (just in case)
  if (!profile) {
    router.push('/auth/login')
    return null
  }

  // DASHBOARD CONTENT (Authenticated and profile loaded)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* User Profile Card */}
        <div className="mb-8">
          <UserProfileCard
            isCurrentUser={true}
            onEdit={() => setShowEditModal(true)}
          />
        </div>

        {/* Edit Profile Modal */}
        <EditProfileModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />

        {/* Channels List - Only render after mount */}
        {mounted && <ChannelList />}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Welcome Section */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Welcome to Your Workspace
            </h2>
            <p className="text-gray-600 mb-4">
              Your profile is all set up! Here&apos;s what you can do:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Edit your profile and upload an avatar
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Your online status is now being tracked
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Customize your settings (theme, timezone, notifications)
              </li>
            </ul>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Username</p>
                <p className="font-semibold text-gray-900">{profile.username}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Timezone</p>
                <p className="font-semibold text-gray-900">{profile.timezone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Notifications</p>
                <p className="font-semibold text-gray-900">
                  {profile.notifications_enabled ? '🔔 Enabled' : '🔕 Disabled'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render after mount (browser-side only)
  if (!mounted) {
    return null
  }

  return <DashboardContent />
}
