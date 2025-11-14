import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, UserPresence } from '@/types'

export type { UserPresence }

interface UserStore {
  profile: Profile | null
  presence: UserPresence | null
  isLoading: boolean
  error: string | null

  setProfile: (profile: Profile) => void
  updateProfile: (updates: Partial<Profile>) => void
  setPresence: (presence: UserPresence) => void
  setIsLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearProfile: () => void
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      presence: null,
      isLoading: false,
      error: null,

      setProfile: (profile) => set({ profile, error: null }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile
            ? { ...state.profile, ...updates }
            : null,
          error: null,
        })),

      setPresence: (presence) => set({ presence }),

      setIsLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearProfile: () =>
        set({ profile: null, presence: null, error: null }),
    }),
    {
      name: 'user-store',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
)