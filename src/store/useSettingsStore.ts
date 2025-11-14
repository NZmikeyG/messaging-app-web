import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Settings {
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  timezone: string
}

interface SettingsStore {
  settings: Settings
  updateSetting: (key: keyof Settings, value: any) => void
  updateAllSettings: (settings: Partial<Settings>) => void
  resetSettings: () => void
}

const defaultSettings: Settings = {
  theme: 'light',
  notifications_enabled: true,
  timezone: 'UTC',
}

export const useSettingsStore = create<SettingsStore>(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      updateSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),
      
      updateAllSettings: (updates) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates,
          },
        })),
      
      resetSettings: () =>
        set({
          settings: defaultSettings,
        }),
    }),
    {
      name: 'user-settings-storage',
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (name) => {
                const item = localStorage.getItem(name)
                return item ? JSON.parse(item) : null
              },
              setItem: (name, value) => {
                localStorage.setItem(name, JSON.stringify(value))
              },
              removeItem: (name) => {
                localStorage.removeItem(name)
              },
            }
          : undefined,
    }
  )
)
