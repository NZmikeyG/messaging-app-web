'use client'

import { supabase } from './client'
import type { Channel, ChannelHierarchy } from '@/lib/types'

/**
 * Get all channels in a workspace with their hierarchy
 */
export async function getChannelHierarchy(workspaceId: string) {
  const { data, error } = await supabase.rpc('get_channel_hierarchy', {
    workspace_id_param: workspaceId,
  })

  if (error) {
    console.error('Error fetching channel hierarchy:', error)
    throw error
  }

  return data as ChannelHierarchy[]
}

/**
 * Get all descendants of a specific channel
 */
export async function getChannelDescendants(channelId: string) {
  const { data, error } = await supabase.rpc('get_channel_descendants', {
    channel_id_param: channelId,
  })

  if (error) {
    console.error('Error fetching channel descendants:', error)
    throw error
  }

  return data as Channel[]
}

/**
 * Create a new channel
 */
export async function createChannel({
  workspaceId,
  name,
  description,
  isPrivate = false,
  parentId,
}: {
  workspaceId: string
  name: string
  description?: string
  isPrivate?: boolean
  parentId?: string
}) {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id

  if (!userId) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspaceId,
      name,
      description,
      is_private: isPrivate,
      parent_id: parentId || null,
      creator_id: userId,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating channel:', error)
    throw error
  }

  // Add creator as channel owner
  await addChannelMember(data.id, userId, 'owner')

  return data as Channel
}

/**
 * Update channel details
 */
export async function updateChannel(
  channelId: string,
  updates: Partial<Channel>
) {
  const { data, error } = await supabase
    .from('channels')
    .update(updates)
    .eq('id', channelId)
    .select()
    .single()

  if (error) {
    console.error('Error updating channel:', error)
    throw error
  }

  return data as Channel
}

/**
 * Delete a channel (cascade deletes all sub-channels)
 */
export async function deleteChannel(channelId: string) {
  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId)

  if (error) {
    console.error('Error deleting channel:', error)
    throw error
  }
}

/**
 * Add a member to a channel
 */
export async function addChannelMember(
  channelId: string,
  userId: string,
  role: 'owner' | 'moderator' | 'member' = 'member'
) {
  const { data, error } = await supabase
    .from('channel_members')
    .insert({
      channel_id: channelId,
      user_id: userId,
      role,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding channel member:', error)
    throw error
  }

  return data
}

/**
 * Remove a member from a channel
 */
export async function removeChannelMember(
  channelId: string,
  userId: string
) {
  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing channel member:', error)
    throw error
  }
}

/**
 * Get all members of a channel
 */
export async function getChannelMembers(channelId: string) {
  const { data, error } = await supabase
    .from('channel_members')
    .select('*, profiles(*)')
    .eq('channel_id', channelId)

  if (error) {
    console.error('Error fetching channel members:', error)
    throw error
  }

  return data
}

/**
 * Check if user is member of channel
 */
export async function isUserChannelMember(
  channelId: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('channel_members')
    .select('id')
    .eq('channel_id', channelId)
    .eq('user_id', userId)
    .single()

  return !error && !!data
}

/**
 * Get a single channel by ID
 */
export async function getChannelById(channelId: string) {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', channelId)
    .single()

  if (error) {
    console.error('Error fetching channel:', error)
    throw error
  }

  return data as Channel
}
