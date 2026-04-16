import { NextResponse } from 'next/server'

/**
 * GET /api/auth/google-drive-reauth
 *
 * Redirects to Google OAuth with the Drive + Docs scopes needed
 * for the Transcription → Google Docs pipeline.
 *
 * After authorising you'll land on /api/auth/callback/google which
 * shows the new GOOGLE_DRIVE_REFRESH_TOKEN — copy it into Vercel env vars.
 */
export async function GET() {
  const clientId    = process.env.GOOGLE_CLIENT_ID!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents',
  ].join(' ')

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         scopes,
    access_type:   'offline',
    prompt:        'consent',   // forces a new refresh token every time
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return NextResponse.redirect(url)
}
