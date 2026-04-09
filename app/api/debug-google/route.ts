import { NextResponse } from 'next/server'

export async function GET() {
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN ?? ''
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''

  // Try the token exchange
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()

  return NextResponse.json({
    hasRefreshToken: !!refreshToken,
    refreshTokenLength: refreshToken.length,
    refreshTokenPreview: refreshToken.slice(0, 20) + '...',
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    tokenResponse: data,
  })
}
