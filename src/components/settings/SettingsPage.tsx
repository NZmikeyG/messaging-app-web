'use client'

import React, { useState } from 'react'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useUserStore } from '@/store/useUserStore'

export const SettingsPage: React.FC = () => {
  const settings = useSettingsStore((state) => state.settings)
  const updateSetting = useSettingsStore((state) => state.updateSetting)
  const profile = useUserStore((state) => state.profile)
  const { updateProfile, loading } = useUserProfile()

  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const timezones = [
    'UTC',
    'GMT',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Australia/Sydney',
    'Pacific/Auckland',
  ]

  const handleSaveSettings = async () => {
    setSaveError(null)
    setIsSaving(true)

    try {
      if (!profile?.id) {
        throw new Error('No profile loaded')
      }

      // Save to database
      await updateProfile({
        theme: settings.theme,
        timezone: settings.timezone,
        notifications_enabled: settings.notifications_enabled,
      })

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setSaveError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    updateSetting('theme', newTheme)
    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          ✓ Settings saved successfully!
        </div>
      )}

      {/* Error Message */}
      {saveError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          ✗ {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Appearance</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Theme
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  checked={settings.theme === 'light'}
                  onChange={() => handleThemeChange('light')}
                  className="w-4 h-4"
                />
                <span className="ml-2 text-sm text-gray-700">Light</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  checked={settings.theme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                  className="w-4 h-4"
                />
                <span className="ml-2 text-sm text-gray-700">Dark</span>
              </label>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Location</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => updateSetting('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Notifications</h2>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notifications_enabled}
              onChange={(e) =>
                updateSetting('notifications_enabled', e.target.checked)
              }
              className="w-4 h-4 rounded"
            />
            <span className="ml-3 text-sm text-gray-700">
              Enable in-app notifications
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-2">
            When enabled, you'll receive notifications for mentions and messages
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
