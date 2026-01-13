import { NextResponse } from 'next/server'
import { generateAuthUrl } from '@/lib/google/oauth'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            console.error('[Google Auth] No userId provided')
            return NextResponse.redirect(new URL('/dashboard/settings?error=no_user', process.env.NEXT_PUBLIC_APP_URL || ''))
        }

        console.log('[Google Auth] Starting OAuth for user:', userId)

        // Pass user ID to OAuth flow via state parameter
        const url = generateAuthUrl(userId)
        return NextResponse.redirect(url)
    } catch (err) {
        console.error('[Google Auth] Error:', err)
        return NextResponse.redirect(new URL('/dashboard/settings?error=auth_init_failed', process.env.NEXT_PUBLIC_APP_URL || ''))
    }
}
