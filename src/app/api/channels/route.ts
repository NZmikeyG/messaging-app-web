import { NextRequest, NextResponse } from 'next/server'

import { supabaseServer as supabase } from '@/lib/supabase/server-api'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 [API] Create channel request')
    const body = await request.json()
    const { name, description, workspace_id, parent_id } = body

    // Validate required fields
    if (!name || !workspace_id) {
      console.warn('⚠️ [API] Missing required fields')
      return NextResponse.json(
        { error: 'Name and workspace_id are required' },
        { status: 400 }
      )
    }

    // Get auth user
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ [API] Authorized, creating channel:', name)

    // Create channel
    const { data, error } = await supabase
      .from('channels')
      .insert([
        {
          name: name.trim(),
          description: description || null,
          workspace_id,
          parent_id: parent_id || null,
          is_private: false,
        },
      ])
      .select()

    if (error) {
      console.error('❌ [API] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Channel not created' }, { status: 500 })
    }

    console.log('✅ [API] Channel created:', data[0].id)
    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    console.error('❌ [API] Exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
