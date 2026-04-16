import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  const html = (body: string) =>
    new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Google Auth</title></head>
       <body style="background:#0f1117;color:#e5e7eb;font-family:monospace;padding:2rem;max-width:860px;margin:0 auto">
       ${body}
       </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )

  if (error) return html(`<h2 style="color:#f87171">❌ Google OAuth Error</h2><p>${error}</p>`)
  if (!code) return html(`<h2 style="color:#f87171">❌ No code received</h2>`)

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (tokens.error) return html(
    `<h2 style="color:#f87171">❌ Token exchange failed</h2>
     <pre style="color:#f87171">${JSON.stringify(tokens, null, 2)}</pre>`
  )

  const refreshToken = tokens.refresh_token

  const tokenBlock = (label: string, value: string | undefined, envKey: string) => `
    <div style="margin-top:1.5rem">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.4rem">
        <span style="color:#60a5fa;font-size:0.85rem">${label}</span>
        <button onclick="copy('${envKey}')"
          style="background:#1e2030;border:1px solid #2a2d3a;color:#a5b4fc;padding:0.2rem 0.75rem;border-radius:4px;cursor:pointer;font-family:monospace;font-size:0.75rem">
          Copy
        </button>
      </div>
      <pre id="${envKey}"
        style="background:#1a1d27;border:1px solid #2a2d3a;padding:1rem;border-radius:6px;
               word-break:break-all;white-space:pre-wrap;margin:0;font-size:0.8rem;color:#d1fae5">
${value ?? '⚠️  No refresh token returned — revoke access at myaccount.google.com/permissions and try again.'}</pre>
    </div>`

  return html(`
    <script>
      function copy(id) {
        const el = document.getElementById(id)
        navigator.clipboard.writeText(el.innerText.trim())
          .then(() => { el.style.borderColor='#34d399'; setTimeout(() => el.style.borderColor='#2a2d3a', 1500) })
      }
    </script>

    <h2 style="color:#34d399">✅ Google OAuth Success!</h2>
    <p style="color:#9ca3af">
      Copy the token below, then run:<br>
      <code style="color:#a5b4fc">npx vercel env rm GOOGLE_DRIVE_REFRESH_TOKEN production</code><br>
      <code style="color:#a5b4fc">npx vercel env add GOOGLE_DRIVE_REFRESH_TOKEN production</code><br>
      then paste the token and redeploy.
    </p>

    ${tokenBlock('GOOGLE_DRIVE_REFRESH_TOKEN (save this in Vercel)', refreshToken, 'driveToken')}
    ${tokenBlock('GOOGLE_ACCESS_TOKEN (short-lived, not needed)', tokens.access_token, 'accessToken')}

    <p style="margin-top:2rem;color:#6b7280">
      Granted scopes: <span style="color:#a5b4fc">${tokens.scope ?? 'unknown'}</span>
    </p>
    <p style="margin-top:1rem">
      <a href="/" style="color:#60a5fa">← Back to dashboard</a>
    </p>
  `)
}
