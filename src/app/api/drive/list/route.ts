import { NextResponse } from 'next/server'
import { listFiles } from '@/lib/googleDrive'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedClient, refreshAccessToken } from '@/lib/google/oauth'

// Use service role client to read integrations (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const q = searchParams.get('q') || undefined
        const pageToken = searchParams.get('pageToken') || undefined
        const integrationId = searchParams.get('integrationId')
        const folderId = searchParams.get('folderId') || undefined

        let authClient = null

        if (integrationId && integrationId !== 'default') {
            console.log('[Drive List] Fetching integration:', integrationId)

            // Fetch integration using admin client
            const { data: integration, error } = await supabaseAdmin
                .from('user_integrations')
                .select('*')
                .eq('id', integrationId)
                .single()

            if (error || !integration) {
                console.error('[Drive List] Integration not found:', error)
                return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
            }

            console.log('[Drive List] Found integration for user:', integration.user_id)

            let accessToken = integration.access_token

            // Check expiry and refresh if needed
            if (integration.expires_at && Date.now() > integration.expires_at) {
                console.log("[Drive List] Token expired, refreshing...")
                const credentials = await refreshAccessToken(integration.refresh_token)
                accessToken = credentials.access_token

                // Update DB
                await supabaseAdmin.from('user_integrations').update({
                    access_token: credentials.access_token,
                    expires_at: credentials.expiry_date,
                    refresh_token: credentials.refresh_token || integration.refresh_token
                }).eq('id', integrationId)
            }

            authClient = await getAuthenticatedClient(accessToken!, integration.refresh_token)
        }

        const data = await listFiles(q, pageToken, authClient, folderId)

        return NextResponse.json(data)
    } catch (error: any) {
        // Handle the case where no drive is configured (expected for fresh installs)
        if (error?.message?.includes('No Drive Client available')) {
            console.warn('No Drive configured, returning empty file list')
            return NextResponse.json({ files: [] })
        }

        console.error('API Drive List Error:', error)
        return NextResponse.json(
            { error: 'Failed to list files' },
            { status: 500 }
        )
    }
}
