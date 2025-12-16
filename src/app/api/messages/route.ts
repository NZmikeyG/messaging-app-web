import { NextRequest, NextResponse } from 'next/server'

import { supabaseServer as supabase } from '@/lib/supabase/server-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    console.log('📥 [API] Fetching messages for channel:', channelId)

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      console.error('❌ [API] Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    console.log('✅ [API] Got', data?.length ?? 0, 'messages')
    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error('❌ [API] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channelId, userId, content } = body

    console.log('📤 [API] POST /api/messages:', { channelId, userId, content })

    if (!channelId || !userId || !content) {
      console.warn('❌ [API] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: channelId, userId, content' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          channel_id: channelId,
          user_id: userId,
          content: content.trim(),
        },
      ])
      .select()

    if (error) {
      console.error('❌ [API] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to send message', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ [API] Message created:', data[0]?.id)
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('❌ [API] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
