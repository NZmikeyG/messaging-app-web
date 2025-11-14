import { create } from 'zustand'

export interface Settings {
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
}

interface SettingsStore {
  settings: Settings
  updateSetting: (key: keyof Settings, value: unknown) => void
  resetSettings: () => void
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  notifications: true,
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  
  updateSetting: (key, value) =>
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    })),
  
  resetSettings: () =>
    set(() => ({
      settings: DEFAULT_SETTINGS,
    })),
}))
