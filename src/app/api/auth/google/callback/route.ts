import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getTokens, decodeState } from '@/lib/google/oauth'

// Use service role client to bypass RLS (safe because we verify user via OAuth state)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('[OAuth Callback] Starting callback processing...')

    if (error) {
        console.error('[OAuth Callback] Error from Google:', error)
        return NextResponse.redirect(new URL('/dashboard/settings?error=auth_failed', request.url))
    }

    if (!code) {
        console.error('[OAuth Callback] No code provided')
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    if (!state) {
        console.error('[OAuth Callback] No state provided')
        return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', request.url))
    }

    // Decode state to get user ID
    const stateData = decodeState(state)
    if (!stateData?.userId) {
        console.error('[OAuth Callback] Invalid state data')
        return NextResponse.redirect(new URL('/dashboard/settings?error=invalid_state', request.url))
    }

    const userId = stateData.userId
    console.log('[OAuth Callback] User ID from state:', userId)

    try {
        console.log('[OAuth Callback] Exchanging code for tokens...')
        const tokens = await getTokens(code)
        console.log('[OAuth Callback] Got tokens, access_token exists:', !!tokens.access_token)

        console.log('[OAuth Callback] Inserting integration for user:', userId)

        // Use admin client to insert (bypasses RLS, but we've verified user via OAuth state)
        const { error: dbError } = await supabaseAdmin.from('user_integrations').insert({
            user_id: userId,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expiry_date,
            label: 'Google Drive',
        })

        if (dbError) {
            console.error('[OAuth Callback] Failed to save integration:', dbError)
            return NextResponse.redirect(new URL('/dashboard/settings?error=save_failed', request.url))
        }

        console.log('[OAuth Callback] Integration saved successfully!')
        return NextResponse.redirect(new URL('/dashboard/settings?success=integration_connected', request.url))
    } catch (err) {
        console.error('[OAuth Callback] Exception:', err)
        return NextResponse.redirect(new URL('/dashboard/settings?error=unknown', request.url))
    }
}
