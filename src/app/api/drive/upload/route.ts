import { NextResponse } from 'next/server'
import { uploadFile } from '@/lib/googleDrive'
import { Readable } from 'stream'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedClient, refreshAccessToken } from '@/lib/google/oauth'

// Use service role client to read integrations (bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const integrationId = formData.get('integrationId') as string | null

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        let authClient = null

        if (integrationId && integrationId !== 'default') {
            const { data: integration, error } = await supabaseAdmin
                .from('user_integrations')
                .select('*')
                .eq('id', integrationId)
                .single()

            if (error || !integration) {
                return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
            }

            let accessToken = integration.access_token

            // Check expiry and refresh if needed
            if (integration.expires_at && Date.now() > integration.expires_at) {
                console.log("Token expired, refreshing...")
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

        // Convert File to Stream
        const buffer = Buffer.from(await file.arrayBuffer())
        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        const data = await uploadFile(stream, file.name, file.type, '', authClient)

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('API Drive Upload Error:', error)
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        )
    }
}
