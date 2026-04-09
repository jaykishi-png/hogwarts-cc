import { google } from 'googleapis'
import type { GmailMessage } from '@/types/source'

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

function decodeBase64(encoded: string): string {
  return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function extractBody(payload: {
  body?: { data?: string | null }
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null }>
}): string {
  if (payload.body?.data) {
    return decodeBase64(payload.body.data).slice(0, 1000)
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64(part.body.data).slice(0, 1000)
      }
    }
  }
  return ''
}

export async function fetchUnreadMessages(
  accessToken: string,
  refreshToken?: string,
  lookbackHours = 48
): Promise<GmailMessage[]> {
  const auth = getOAuthClient()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const gmail = google.gmail({ version: 'v1', auth })

  const after = Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000)

  // Fetch unread messages in inbox where user is To/CC
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `is:unread in:inbox after:${after}`,
    maxResults: 50,
  })

  const messages = listRes.data.messages ?? []
  if (messages.length === 0) return []

  const results: GmailMessage[] = []

  // Fetch details for each message (batch via Promise.all with concurrency limit)
  const CONCURRENCY = 5
  for (let i = 0; i < messages.length; i += CONCURRENCY) {
    const chunk = messages.slice(i, i + CONCURRENCY)
    const details = await Promise.allSettled(
      chunk.map(m =>
        gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'full',
          metadataHeaders: ['Subject', 'From', 'To', 'Cc', 'Date'],
        })
      )
    )

    for (const result of details) {
      if (result.status !== 'fulfilled') continue
      const msg = result.value.data

      const headers = msg.payload?.headers ?? []
      const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''

      const subject = get('Subject')
      const from = get('From')
      const to = get('To')
      const cc = get('Cc')
      const recipients = [...to.split(','), ...cc.split(',')]
        .map(r => r.trim())
        .filter(Boolean)

      const body = extractBody(msg.payload ?? {})

      results.push({
        threadId: msg.threadId ?? '',
        messageId: msg.id ?? '',
        subject,
        from,
        to: recipients,
        snippet: msg.snippet ?? '',
        body,
        receivedAt: new Date(parseInt(msg.internalDate ?? '0')).toISOString(),
        isUnread: (msg.labelIds ?? []).includes('UNREAD'),
        isStarred: (msg.labelIds ?? []).includes('STARRED'),
        labels: msg.labelIds ?? [],
      })
    }
  }

  return results
}

export async function fetchUnrepliedThreads(
  accessToken: string,
  refreshToken?: string,
  thresholdHours = 24
): Promise<GmailMessage[]> {
  const auth = getOAuthClient()
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken })

  const gmail = google.gmail({ version: 'v1', auth })

  // Threads where user was in To/CC and has not replied
  const after = Math.floor((Date.now() - thresholdHours * 60 * 60 * 1000) / 1000)

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox -from:me after:${after} -is:unread`,
    maxResults: 20,
  })

  const messages = listRes.data.messages ?? []
  const results: GmailMessage[] = []

  for (const m of messages.slice(0, 10)) {
    try {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: m.id!,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'To', 'Cc'],
      })

      const headers = msg.data.payload?.headers ?? []
      const get = (name: string) => headers.find(h => h.name === name)?.value ?? ''

      results.push({
        threadId: msg.data.threadId ?? '',
        messageId: msg.data.id ?? '',
        subject: `Follow-up: ${get('Subject')}`,
        from: get('From'),
        to: [get('To')],
        snippet: msg.data.snippet ?? '',
        receivedAt: new Date(parseInt(msg.data.internalDate ?? '0')).toISOString(),
        isUnread: false,
        isStarred: (msg.data.labelIds ?? []).includes('STARRED'),
        labels: msg.data.labelIds ?? [],
      })
    } catch {
      // Skip on individual message fetch failure
    }
  }

  return results
}
