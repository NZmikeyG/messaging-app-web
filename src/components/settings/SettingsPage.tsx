'use client'

import React, { useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function SettingsPage() {
  const settings = useSettingsStore((state) => state.settings)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const profile = useUserStore((state) => state.profile)
  const { updateProfile } = useUserProfile()

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    theme: settings.theme,
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.currentTarget
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveProfile = async () => {
    setSaveError(null)
    setSaveSuccess(false)
    setIsSaving(true)

    try {
      await updateProfile({
        username: formData.username,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSettings = () => {
    updateSetting('theme', formData.theme)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Profile Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Preferences</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="theme" className="block text-sm font-medium mb-1">
                Theme
              </label>
              <select
                id="theme"
                name="theme"
                value={formData.theme}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="p-4 bg-green-900 border border-green-700 rounded-lg text-green-100 mb-4">
            Changes saved successfully!
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="p-4 bg-red-900 border border-red-700 rounded-lg text-red-100 mb-4">
            {saveError}
          </div>
        )}
      </div>
    </div>
  )
}
