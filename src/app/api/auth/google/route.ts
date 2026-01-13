import { NextResponse } from 'next/server'
import { generateAuthUrl } from '@/lib/google/oauth'

export async function GET() {
    const url = generateAuthUrl()
    return NextResponse.redirect(url)
}
