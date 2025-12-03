import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  email: string
  username?: string
  status?: string
  created_at?: string
}

export async function getAllUsers(): Promise<User[]> {
  try {
    console.log('🔍 Starting getAllUsers query...')

    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, status, created_at')
      .order('email')

    console.log('✅ Query complete')

    if (error) {
      console.error('❌ Supabase error:', error)
      return []
    }

    console.log(`✅ Found ${data?.length || 0} users in database`)
    console.log('Users data:', data)

    return data || []
  } catch (error) {
    console.error('❌ Error in getAllUsers:', error)
    return []
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    // Query users table instead of profiles
    const { data, error } = await supabase
      .from('users')
      .select('id, email, username, status, created_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

export async function updateUserStatus(
  userId: string,
  status: 'online' | 'away' | 'offline'
): Promise<boolean> {
  try {
    // Update users table instead of profiles
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)

    if (error) {
      console.error('Error updating status:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserStatus:', error)
    return false
  }
}
