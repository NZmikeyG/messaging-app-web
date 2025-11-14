import { create } from 'zustand'

export interface UserProfile {
  id: string
  username: string
  bio: string
  avatar_url: string | null
  theme: 'light' | 'dark'
  notifications_enabled: boolean
  timezone: string
  created_at: string
  updated_at: string
}

export interface UserPresence {
  user_id: string
  is_online: boolean
  last_seen: string
}

interface UserStore {
  profile: UserProfile | null
  presence: UserPresence | null
  isLoading: boolean
  error: string | null
  
  setProfile: (profile: UserProfile) => void
  updateProfile: (updates: Partial<UserProfile>) => void
  setPresence: (presence: UserPresence) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  presence: null,
  isLoading: false,
  error: null,
  
  setProfile: (profile) => set({ profile, error: null }),
  
  updateProfile: (updates) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...updates } : null,
    error: null,
  })),
  
  setPresence: (presence) => set({ presence }),
  
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  clearProfile: () => set({ profile: null, presence: null }),
}))
