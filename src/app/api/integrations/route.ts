import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role client to bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'No integration ID provided' }, { status: 400 })
        }

        console.log('[Integration Delete] Deleting integration:', id)

        const { error } = await supabaseAdmin
            .from('user_integrations')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[Integration Delete] Error:', error)
            return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
        }

        console.log('[Integration Delete] Success')
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Integration Delete] Exception:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
