import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTokens } from '@/lib/google/oauth'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(new URL('/dashboard/settings?error=auth_failed', request.url))
    }

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    try {
        const tokens = await getTokens(code)

        // Save to Supabase
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.redirect(new URL('/auth/login', request.url))
        }

        // Insert into user_integrations
        const { error: dbError } = await supabase.from('user_integrations').insert({
            user_id: user.id,
            provider: 'google',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: tokens.expiry_date,
            label: 'Google Drive', // Default label
        })

        if (dbError) {
            console.error('Failed to save integration:', dbError)
            return NextResponse.redirect(new URL('/dashboard/settings?error=save_failed', request.url))
        }

        return NextResponse.redirect(new URL('/dashboard/settings?success=integration_connected', request.url))
    } catch (err) {
        console.error('Callback Error:', err)
        return NextResponse.redirect(new URL('/dashboard/settings?error=unknown', request.url))
    }
}
