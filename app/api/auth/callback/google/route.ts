import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(
      `<html><body style="background:#0f1117;color:#e5e7eb;font-family:monospace;padding:2rem">
        <h2 style="color:#f87171">Google OAuth Error</h2>
        <p>${error}</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!code) {
    return new NextResponse(
      `<html><body style="background:#0f1117;color:#e5e7eb;font-family:monospace;padding:2rem">
        <h2 style="color:#f87171">No code received</h2>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (tokens.error) {
    return new NextResponse(
      `<html><body style="background:#0f1117;color:#e5e7eb;font-family:monospace;padding:2rem">
        <h2 style="color:#f87171">Token exchange failed</h2>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const refreshToken = tokens.refresh_token
  const accessToken = tokens.access_token

  return new NextResponse(
    `<html><body style="background:#0f1117;color:#e5e7eb;font-family:monospace;padding:2rem;max-width:800px">
      <h2 style="color:#34d399">✅ Google OAuth Success!</h2>
      <p style="color:#9ca3af">Copy these values — you only get the refresh token once.</p>

      <div style="margin-top:1.5rem">
        <p style="color:#60a5fa;margin-bottom:0.25rem">GOOGLE_REFRESH_TOKEN</p>
        <div style="background:#1a1d27;border:1px solid #2a2d3a;padding:1rem;border-radius:6px;word-break:break-all;user-select:all">
          ${refreshToken ?? '⚠️ No refresh token returned — you may have already authorized once. Revoke access at myaccount.google.com/permissions and try again.'}
        </div>
      </div>

      <div style="margin-top:1.5rem">
        <p style="color:#60a5fa;margin-bottom:0.25rem">GOOGLE_ACCESS_TOKEN (short-lived)</p>
        <div style="background:#1a1d27;border:1px solid #2a2d3a;padding:1rem;border-radius:6px;word-break:break-all;user-select:all">
          ${accessToken}
        </div>
      </div>

      <p style="margin-top:2rem;color:#9ca3af">Paste these into your .env.local and Vercel environment variables, then <a href="/" style="color:#60a5fa">go to the dashboard</a>.</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
