'use client'

import { useCallback } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export const useUserProfile = () => {
  const { setProfile, setIsLoading, setError } = useUserStore()

  const createDefaultProfile = useCallback(
    async (userId: string) => {
      try {
        const { data: userAuth } = await supabase.auth.getUser()
        const userEmail = userAuth?.user?.email || 'user'
        const defaultUsername = `${userEmail.split('@')}_${userId.slice(0, 6)}`

        const { data, error } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              username: defaultUsername,
              bio: '',
              avatar_url: null,
              theme: 'light',
              notifications_enabled: true,
              timezone: 'UTC',
            },
          ])
          .select()
          .single()

        if (error) throw error

        setProfile(data as Profile)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create profile'
        setError(message)
        console.error('Error creating profile:', err)
      }
    },
    [setProfile, setError]
  )

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            await createDefaultProfile(userId)
          } else {
            throw fetchError
          }
        } else {
          setProfile(data as Profile)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch profile'
        setError(message)
        console.error('Error fetching profile:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [setProfile, setIsLoading, setError, createDefaultProfile]
  )

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      try {
        setIsLoading(true)
        setError(null)

        const currentProfile = useUserStore.getState().profile
        if (!currentProfile || !currentProfile.id) {
          throw new Error('No profile loaded')
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', currentProfile.id)
          .select()
          .single()

        if (error) throw error

        useUserStore.getState().setProfile(data as Profile)

        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        setError(message)
        console.error('Error updating profile:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, setError]
  )

  const uploadAvatar = useCallback(
    async (file: File, userId: string) => {
      try {
        setIsLoading(true)
        setError(null)

        if (file.size > 1024 * 1024) {
          throw new Error('File size must be less than 1MB')
        }

        if (!file.type.startsWith('image/')) {
          throw new Error('File must be an image')
        }

        const fileName = `${userId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)

        await updateProfile({ avatar_url: data.publicUrl })

        return data.publicUrl
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upload avatar'
        setError(message)
        console.error('Error uploading avatar:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, setError, updateProfile]
  )

  const deleteAvatar = useCallback(
    async (avatarUrl: string) => {
      try {
        setIsLoading(true)
        setError(null)

        const urlParts = avatarUrl.split('/storage/v1/object/public/avatars/')
        if (!urlParts) {
          throw new Error('Invalid avatar URL')
        }

        const filePath = urlParts

        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([filePath])

        if (deleteError) throw deleteError

        await updateProfile({ avatar_url: null })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete avatar'
        setError(message)
        console.error('Error deleting avatar:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [setIsLoading, setError, updateProfile]
  )

  return {
    fetchProfile,
    createDefaultProfile,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
  }
}
