'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { IntegrationsForm } from '@/components/settings/IntegrationsForm'
import { useUserStore } from '@/store/useUserStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { updateUserProfile, updateUserEmail } from '@/lib/supabase/users'
import { supabase } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const { profile, fetchProfile } = useUserStore()
  const settings = useSettingsStore((state) => state.settings)
  const updateSetting = useSettingsStore((state) => state.updateSetting)

  // Profile form state
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [showEmailChange, setShowEmailChange] = useState(false)

  // Preferences state
  const [theme, setTheme] = useState(settings.theme)
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notifications)

  // Status messages
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [emailSending, setEmailSending] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSuccess, setPrefSuccess] = useState(false)

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  // Generate random avatar
  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7)
    setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)
  }

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!profile) return
    setProfileError(null)
    setProfileSuccess(false)
    setProfileSaving(true)

    try {
      await updateUserProfile(profile.id, {
        username: username.trim(),
        avatar_url: avatarUrl.trim() || undefined
      })
      await fetchProfile(profile.id)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setProfileSaving(false)
    }
  }

  // Request email change
  const handleEmailChange = async () => {
    if (!newEmail.trim()) return
    setEmailError(null)
    setEmailSuccess(false)
    setEmailSending(true)

    try {
      await updateUserEmail(newEmail.trim())
      setEmailSuccess(true)
      setShowEmailChange(false)
      setNewEmail('')
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send verification email')
    } finally {
      setEmailSending(false)
    }
  }

  // Save preferences
  const handleSavePreferences = () => {
    setPrefSaving(true)
    updateSetting('theme', theme)
    updateSetting('notifications', notificationsEnabled)
    setPrefSuccess(true)
    setPrefSaving(false)
    setTimeout(() => setPrefSuccess(false), 3000)
  }

  // Sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <div className="min-h-full theme-bg-primary theme-text-primary p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 mt-2">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <section className="theme-bg-secondary rounded-xl p-6 mb-6 border theme-border-secondary">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">👤</span> Profile
          </h2>

          <div className="space-y-4">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">Avatar</label>
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center overflow-hidden border-2 border-gray-600">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar preview"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {username?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="Enter avatar URL..."
                    className="w-full px-4 py-2 theme-bg-input border theme-border-secondary rounded-lg theme-text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={generateRandomAvatar}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 hover:text-white transition flex items-center gap-2"
                  >
                    🎲 Generate Random
                  </button>
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium theme-text-secondary mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 theme-bg-input border theme-border-secondary rounded-lg theme-text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your username"
              />
            </div>

            {/* Save Profile Button */}
            <button
              onClick={handleSaveProfile}
              disabled={profileSaving}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>

            {profileSuccess && (
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
                ✓ Profile updated successfully!
              </div>
            )}
            {profileError && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                ✗ {profileError}
              </div>
            )}
          </div>
        </section>

        {/* Account Section */}
        <section className="theme-bg-secondary rounded-xl p-6 mb-6 border theme-border-secondary">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📧</span> Account
          </h2>

          <div className="space-y-4">
            {/* Current Email */}
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">Email Address</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 px-4 py-2 theme-bg-input border theme-border-secondary rounded-lg theme-text-muted">
                  {profile?.email || 'Loading...'}
                </div>
                <button
                  onClick={() => setShowEmailChange(!showEmailChange)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 hover:text-white transition"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Email Change Form */}
            {showEmailChange && (
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-600 space-y-3">
                <p className="text-sm text-gray-400">
                  Enter your new email address. A verification link will be sent to confirm the change.
                </p>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEmailChange}
                    disabled={emailSending || !newEmail.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emailSending ? 'Sending...' : 'Send Verification'}
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailChange(false)
                      setNewEmail('')
                      setEmailError(null)
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition text-sm"
                  >
                    Cancel
                  </button>
                </div>
                {emailError && (
                  <div className="p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
                    ✗ {emailError}
                  </div>
                )}
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
                ✓ Verification email sent! Please check your inbox.
              </div>
            )}
          </div>
        </section>

        {/* Preferences Section */}
        <section className="theme-bg-secondary rounded-xl p-6 mb-6 border theme-border-secondary">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚙️</span> Preferences
          </h2>

          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label htmlFor="theme" className="block text-sm font-medium theme-text-secondary mb-2">
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'auto')}
                className="w-full px-4 py-2 theme-bg-input border theme-border-secondary rounded-lg theme-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto (System)</option>
              </select>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between py-2">
              <div>
                <label className="text-sm font-medium theme-text-secondary">
                  Enable Notifications
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Receive notifications for new messages and mentions
                </p>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'
                    }`}
                />
              </button>
            </div>

            {/* Save Preferences Button */}
            <button
              onClick={handleSavePreferences}
              disabled={prefSaving}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {prefSaving ? 'Saving...' : 'Save Preferences'}
            </button>

            {prefSuccess && (
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
                ✓ Preferences saved successfully!
              </div>
            )}
          </div>
        </section>

        {/* Integrations Section */}
        <section className="theme-bg-secondary rounded-xl p-6 mb-6 border theme-border-secondary">
          <IntegrationsForm />
        </section>

        {/* Account Actions */}
        <section className="theme-bg-secondary rounded-xl p-6 border theme-border-secondary">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🚪</span> Account Actions
          </h2>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 text-red-400 hover:text-red-300 rounded-lg font-medium transition"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  )
}
