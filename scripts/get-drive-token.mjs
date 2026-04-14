/**
 * One-time script to get a Google OAuth token with Drive scope.
 * Spins up a localhost server to catch the redirect automatically.
 * Run: node scripts/get-drive-token.mjs
 */

import { google } from 'googleapis'
import http from 'http'
import { URL } from 'url'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

function writeEnvValue(filePath, key, value) {
  let content = fs.readFileSync(filePath, 'utf8')
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`)
  } else {
    content += `\n${key}=${value}`
  }
  fs.writeFileSync(filePath, content)
}

const env = loadEnv(envPath)
const REDIRECT = 'http://localhost:3333/oauth2callback'

const oauth2Client = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  REDIRECT
)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.readonly'],
  prompt: 'consent',
})

console.log('\n══════════════════════════════════════════════════')
console.log(' Google Drive Authorization')
console.log('══════════════════════════════════════════════════')
console.log('\nOpen this URL in your browser:\n')
console.log(authUrl)
console.log('\nWaiting for Google to redirect back…\n')

// Start local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) return

  const code = new URL(req.url, 'http://localhost:3333').searchParams.get('code')
  if (!code) {
    res.end('No code received.')
    return
  }

  res.end('<html><body style="background:#0a0c14;color:#e5e7eb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><h2>✅ Authorized! You can close this tab and return to your terminal.</h2></body></html>')

  try {
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens.refresh_token) {
      console.log('⚠️  No refresh token returned.')
      console.log('   Go to https://myaccount.google.com/permissions, revoke access for your app, then re-run.\n')
      server.close()
      process.exit(1)
    }
    writeEnvValue(envPath, 'GOOGLE_DRIVE_REFRESH_TOKEN', tokens.refresh_token)
    console.log('✅ Drive refresh token saved to .env.local')
    console.log('   Starting ingestion now…\n')
    server.close()

    // Kick off ingestion immediately
    const { default: { execSync } } = await import('child_process')
    execSync('node scripts/ingest-knowledge.mjs', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  } catch (err) {
    console.error('❌ Error:', err.message)
    server.close()
    process.exit(1)
  }
})

server.listen(3333, () => {
  console.log('Listening on http://localhost:3333 …')
})
