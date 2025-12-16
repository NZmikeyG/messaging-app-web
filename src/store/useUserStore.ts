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
  fetchProfile: (userId: string) => Promise<void> // Add this
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

      fetchProfile: async (userId: string) => {
        try {
          // Dynamic import to avoid circular dependency
          const { getUserById } = await import('@/lib/supabase/users')
          const profile = await getUserById(userId)

          if (profile) {
            set((state) => ({
              profile: {
                ...profile,
                // Preserve status if the fetch returned offline but we think we are online? 
                // Actually getUserById fetches status from presence, so it should be accurate-ish.
                // But let's trust the fetch.
              },
              error: null
            }))
          }
        } catch (e) {
          console.error('❌ Error fetching profile in store:', e)
          set({ error: 'Failed to refresh profile' })
        }
      },

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