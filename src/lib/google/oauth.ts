import { google } from 'googleapis'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
)

// Generate auth URL with user ID in state parameter
export function generateAuthUrl(userId: string) {
    // Encode user ID in state to preserve across redirect
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64')

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get refresh_token
        scope: [
            'https://www.googleapis.com/auth/drive.readonly', // See all files
            // Add calendar scopes here later
        ],
        prompt: 'consent', // Force consent to ensure we get a refresh token
        state, // Pass user ID through OAuth flow
    })
}

// Decode state parameter to get user ID
export function decodeState(state: string): { userId: string } | null {
    try {
        const decoded = Buffer.from(state, 'base64').toString('utf-8')
        return JSON.parse(decoded)
    } catch {
        return null
    }
}

export async function getTokens(code: string) {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens
}

export async function getAuthenticatedClient(accessToken: string, refreshToken?: string) {
    const client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    )

    client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    })

    return client
}

// Helper to refresh token if expired
export async function refreshAccessToken(refreshToken: string) {
    const client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI
    )
    client.setCredentials({ refresh_token: refreshToken })

    const { credentials } = await client.refreshAccessToken()
    return credentials
}
