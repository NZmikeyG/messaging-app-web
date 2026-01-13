'use client'

import { supabase } from './client'
import type { Profile as UserProfile } from '@/types'

/**
 * Get user profile with fallback to profiles table
 */
export const getUserProfile = async (
  userId: string,
  userEmail: string
): Promise<UserProfile | null> => {
  try {
    console.log('📥 [USER PROFILE] Fetching for:', userId, userEmail)

    // 1. Try profiles table FIRST (Priority Source)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (profileData) {
      console.log('✅ [USER PROFILE] Found in profiles table:', profileData)
      return {
        id: profileData.id,
        email: profileData.email || userEmail,
        username: profileData.username || profileData.email?.split('@')[0] || 'User',
        avatar_url: profileData.avatar_url,
        status: 'online', // Status is managed by presence
      }
    }

    // 2. Fallback to users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, status, workspace_id')
      .eq('id', userId)
      .maybeSingle()

    if (userData) {
      console.log('✅ [USER PROFILE] Found in users table:', userData)
      return {
        id: userData.id,
        email: userData.email || userEmail,
        username: userData.username || userData.email?.split('@')[0] || 'User',
        avatar_url: userData.avatar_url,
        status: userData.status || 'online',
        workspace_id: userData.workspace_id,
      }
    }

    if (userError && !userError.message.includes('no rows')) {
      console.warn('⚠️ [USER PROFILE] Users table error:', userError)
    }

    // Create default fallback
    console.log('⚠️ [USER PROFILE] No profile found, using fallback')
    return {
      id: userId,
      email: userEmail,
      username: userEmail.split('@')[0] || 'User',
      status: 'online',
    }
  } catch (error) {
    console.error('❌ [USER PROFILE] Exception:', error)
    return {
      id: userId,
      email: userEmail,
      username: userEmail.split('@')[0] || 'User',
      status: 'online',
    }
  }
}

/**
 * Get any user by ID for DMs
 */
export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  try {
    // 1. Try profiles table FIRST
    // usage of 'status' in select causes 400 if column missing.
    // Fetch presence separately if needed, or assume caller handles presence.
    // Ideally we join or do parallel fetch, but here we just get profile data.
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    let status = 'offline'

    // Fetch status from presence if we got a profile (or even if we didn't, to be safe)
    if (profileData) {
      const { data: presence } = await supabase
        .from('user_presence')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle()
      if (presence) status = presence.status
    }

    if (profileData) {
      return {
        id: profileData.id,
        email: profileData.email,
        username: profileData.username || profileData.email?.split('@')[0],
        avatar_url: profileData.avatar_url,
        status: status,
      }
    }

    // 2. Fallback to users table
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, status')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      return {
        id: data.id,
        email: data.email,
        username: data.username || data.email?.split('@')[0],
        avatar_url: data.avatar_url,
        status: data.status,
      }
    }

    return null
  } catch (error) {
    console.error('❌ [GET USER] Exception:', error)
    return null
  }
}

/**
 * Get all users, prefer profiles table
 */
export const getAllUsers = async (workspaceId?: string): Promise<UserProfile[]> => {
  try {
    // Try querying profiles first as it is likely the writable table
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, username, avatar_url')

    if (profiles && profiles.length > 0) {
      return profiles.map((p: any) => ({
        id: p.id,
        email: p.email,
        username: p.username || p.email?.split('@')[0] || 'User',
        avatar_url: p.avatar_url,
        status: 'offline', // Bulk fetch mostly used for lists, status often fetched separately or reactive
        workspace_id: workspaceId
      }))
    }

    // Fallback to users table if profiles specific query failed or empty (unlikely if migration exists)
    let query = supabase.from('users').select('id, email, username, avatar_url, status')
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ Error fetching all users:', error)
      return []
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      username: u.username || u.email?.split('@')[0],
      avatar_url: u.avatar_url,
      status: u.status
    }))
  } catch (error) {
    console.error('❌ Exception in getAllUsers:', error)
    return []
  }
}

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: { username?: string; avatar_url?: string; status?: string }
): Promise<void> => {
  try {
    console.log('📤 [UPDATE PROFILE] Updating for:', userId, updates)

    // 1. Prepare valid payload for PROFILES (NO STATUS)
    // Extract status and remove it from the profile payload
    const { status, ...profileUpdates } = updates

    const profilePayload: any = {
      id: userId,
      updated_at: new Date().toISOString(),
      ...profileUpdates
    }

    // Remove undefined values
    Object.keys(profilePayload).forEach(key => profilePayload[key] === undefined && delete profilePayload[key])

    // Only update profiles if there are profile-related updates (username/avatar)
    // or if we are just ensuring the record exists.
    // If only status is updated, we skip this unless we want to touch updated_at.

    // 2. PRIMARY: Upsert to 'profiles' table
    // CRITICAL FIX: Only upsert to profiles if we actually have profile data to update.
    // If we only have status, we skip this to avoid "null username" errors on insert if row triggers creation.
    const hasProfileUpdates = Object.keys(profileUpdates).length > 0

    if (hasProfileUpdates) {
      if (!profilePayload.username && !profilePayload.email) {
        // If we are trying to update profile without username but profile might not exist... 
        // actually we just proceed, but we expect username to be in payload if it's a new user.
        // Ideally we should merge with existing data if possible, but here we just upsert.
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })

      if (profileError) {
        console.error('❌ [UPDATE PROFILE] Profiles update failed:', profileError)
        // If profile update fails (e.g. constraints), we should probably stop or at least warn
        if (profileError.message.includes('null value in column "username"')) {
          console.error('❌ [UPDATE PROFILE] Failed because username is missing. Ensure username is provided for new profiles.')
        }
        throw profileError
      }
      console.log('✅ [UPDATE PROFILE] Profiles table updated')
    } else {
      console.log('ℹ️ [UPDATE PROFILE] Skipping profiles table update (status only)')
    }

    // 3. SECONDARY: Sync to 'users' table (Best effort, legacy support)
    // We use UPDATE instead of UPSERT because 'id' might not be a primary key constraint in the way upsert expects,
    // or RLS prevents INSERT. Since we know the user exists (auth), UPDATE is safer.
    const usersPayload = { ...profilePayload }
    if (status) usersPayload.status = status

    const { error: userError } = await supabase
      .from('users')
      .update(usersPayload)
      .eq('id', userId)

    if (userError) {
      // Just debug log, as this is non-critical
      console.log('ℹ️ [UPDATE PROFILE] Users table sync skipped:', userError.message)
    }

    // 4. Update presence status if included
    if (status) {
      console.log('📤 [UPDATE PROFILE] Updating status in user_presence:', status)
      const { error: presenceError } = await supabase.from('user_presence').upsert({
        user_id: userId,
        status: status,
        is_online: status !== 'offline',
        last_seen: new Date().toISOString()
      }, { onConflict: 'user_id' }) // Ensure onConflict is correct for presence table

      if (presenceError) {
        console.error('❌ [UPDATE PROFILE] Presence update failed:', presenceError)
      } else {
        console.log('✅ [UPDATE PROFILE] Presence updated')
      }
    }

  } catch (error: any) {
    console.error('❌ Error updating profile:', error.message || error)
    throw error
  }
}

/**
 * Update user email via Supabase Auth (requires email verification)
 */
export const updateUserEmail = async (newEmail: string): Promise<void> => {
  try {
    console.log('📤 [UPDATE EMAIL] Requesting email change to:', newEmail)

    const { error } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (error) {
      console.error('❌ [UPDATE EMAIL] Failed:', error)
      throw error
    }

    console.log('✅ [UPDATE EMAIL] Verification email sent')
  } catch (error: any) {
    console.error('❌ [UPDATE EMAIL] Exception:', error.message || error)
    throw new Error(error.message || 'Failed to update email')
  }
}
