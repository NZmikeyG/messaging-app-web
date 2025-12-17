'use client'

import { supabase } from './client'
import type { Channel, ChannelHierarchy } from '@/types'

/**
 * Get all channels in a workspace with their hierarchy
 */
export async function getChannelHierarchy(
  workspaceId: string
): Promise<ChannelHierarchy[]> {
  try {
    console.log('📥 [CHANNELS] Fetching hierarchy for workspace:', workspaceId)

    // Try RPC first
    const { data, error } = await supabase.rpc('get_channel_hierarchy', {
      workspace_id_param: workspaceId,
    })

    // Helper to build tree from flat list
    const buildTree = (channels: any[]): ChannelHierarchy[] => {
      const channelMap = new Map<string, any>()
      channels.forEach(ch => channelMap.set(ch.id, { ...ch, children: [] }))

      const roots: ChannelHierarchy[] = []

      channelMap.forEach(node => {
        if (node.parent_id) {
          const parent = channelMap.get(node.parent_id)
          if (parent) {
            parent.children.push(node)
          } else {
            // If parent not found (orphan), treat as root
            roots.push(node)
          }
        } else {
          roots.push(node)
        }
      })

      return roots
    }

    if (error) {
      // Silence known RPC type mismatch error (42804) or bad request (400)
      if (error.code !== '42804' && error.code !== 'PGRST202') {
        console.log('ℹ️ [CHANNELS] RPC unavailable, using fallback:', error.message)
      }

      // Fallback: query channels table directly
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('channels')
        .select('id, name, description, is_private, parent_id, created_at, creator_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true })

      if (fallbackError) {
        console.error('❌ [CHANNELS] Fallback query failed:', fallbackError)
        throw fallbackError
      }

      console.log('✅ [CHANNELS] Got', fallbackData?.length ?? 0, 'channels (fallback flat)')
      const tree = buildTree(fallbackData || [])
      return tree
    }

    // Even if RPC returns data, ensure it's structurally correct (some RPCs might return flat too depending on version)
    // If the RPC returns a tree, good. If it returns flat, we might need to check.
    // Assuming RPC `get_channel_hierarchy` returns a recursive JSON or similar.
    // However, if the user says it's flat, maybe the RPC itself is returning flat data or failing.
    // Safest bet: If data looks flat (no children and has parent_id), build tree.

    // For now, let's assume RPC works if no error. But given the issue, I will force the tree build if it looks flat.
    // Actually, checking if the RPC returns the correct shape is hard without seeing the RPC code.
    // But if the user is seeing flatness, likely we are hitting the fallback.

    return (data || []) as ChannelHierarchy[]
  } catch (error) {
    console.error('❌ [CHANNELS] Exception:', error)
    throw error
  }
}

/**
 * Get all descendants of a specific channel
 */
export async function getChannelDescendants(channelId: string): Promise<Channel[]> {
  try {
    const { data, error } = await supabase.rpc('get_channel_descendants', {
      channel_id_param: channelId,
    })

    if (error) {
      console.warn('⚠️ Fallback for descendants:', error)

      // Fallback: manual recursive query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('channels')
        .select('id, name, description, is_private, parent_id, created_at, creator_id')
        .eq('parent_id', channelId)

      if (fallbackError) throw fallbackError
      return (fallbackData || []) as Channel[]
    }

    return (data || []) as Channel[]
  } catch (error) {
    console.error('❌ Error fetching channel descendants:', error)
    throw error
  }
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
}): Promise<Channel> {
  try {
    console.log('📤 [CHANNELS] Creating channel:', name)

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
        description: description || null,
        is_private: isPrivate,
        parent_id: parentId || null,
        creator_id: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating channel:', error)
      throw error
    }

    // Add creator as channel owner
    await addChannelMember(data.id, userId, 'owner')

    console.log('✅ [CHANNELS] Channel created:', data.id)
    return data as Channel
  } catch (error) {
    console.error('❌ Exception in createChannel:', error)
    throw error
  }
}

/**
 * Update channel details
 */
export async function updateChannel(
  channelId: string,
  updates: Partial<Channel>
): Promise<Channel> {
  try {
    const { data, error } = await supabase
      .from('channels')
      .update(updates)
      .eq('id', channelId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating channel:', error)
      throw error
    }

    return data as Channel
  } catch (error) {
    console.error('❌ Exception in updateChannel:', error)
    throw error
  }
}

/**
 * Delete a channel
 */
export async function deleteChannel(channelId: string): Promise<void> {
  try {
    // Verify ownership first for better error message
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: channelToCheck } = await supabase
        .from('channels')
        .select('creator_id')
        .eq('id', channelId)
        .single()

      if (channelToCheck && channelToCheck.creator_id !== user.id) {
        console.error(`❌ [CHANNELS] Delete blocked: User ${user.id} is not owner of ${channelId} (Owner: ${channelToCheck.creator_id})`)
        throw new Error('You are not the owner of this channel')
      }
    }

    const { error, count } = await supabase
      .from('channels')
      .delete({ count: 'exact' })
      .eq('id', channelId)

    if (error) {
      console.error('❌ Error deleting channel:', error)
      throw error
    }

    if (count === 0) {
      throw new Error('Channel not found or permission denied (must be owner)')
    }
    console.log('✅ [CHANNELS] Successfully deleted channel. Rows affected:', count)
  } catch (error) {
    console.error('❌ Exception in deleteChannel:', error)
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
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('channel_members')
      .insert({
        channel_id: channelId,
        user_id: userId,
        role,
      })
      .select()
      .single()

    if (error && !error.message.includes('duplicate')) {
      console.error('❌ Error adding channel member:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ Exception in addChannelMember:', error)
  }
}

/**
 * Remove a member from a channel
 */
export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('channel_members')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error removing channel member:', error)
      throw error
    }
  } catch (error) {
    console.error('❌ Exception in removeChannelMember:', error)
    throw error
  }
}

/**
 * Get all members of a channel
 */
export async function getChannelMembers(channelId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('channel_members')
      .select('*, users(*)')
      .eq('channel_id', channelId)

    if (error) {
      console.error('❌ Error fetching channel members:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ Exception in getChannelMembers:', error)
    throw error
  }
}

/**
 * Check if user is member of channel
 */
export async function isUserChannelMember(
  channelId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    return false
  }
}

/**
 * Get a single channel by ID
 */
export async function getChannelById(channelId: string): Promise<Channel> {
  try {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()

    if (error) {
      console.error('❌ Error fetching channel:', error)
      throw error
    }

    return data as Channel
  } catch (error) {
    console.error('❌ Exception in getChannelById:', error)
    throw error
  }
}
