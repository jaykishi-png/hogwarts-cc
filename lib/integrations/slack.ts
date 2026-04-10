import { WebClient } from '@slack/web-api'
import type { SlackMessage } from '@/types/source'

function getClient() {
  const token = process.env.SLACK_BOT_TOKEN?.trim()
  if (!token) throw new Error('SLACK_BOT_TOKEN not set')
  return new WebClient(token)
}

async function getMyUserId(client: WebClient): Promise<string> {
  const auth = await client.auth.test()
  return (auth.user_id as string) ?? ''
}

export async function fetchMentionsAndDMs(
  lookbackHours = 24
): Promise<SlackMessage[]> {
  const client = getClient()
  const myUserId = await getMyUserId(client)
  const oldest = String(Math.floor((Date.now() - lookbackHours * 60 * 60 * 1000) / 1000))

  const messages: SlackMessage[] = []

  // ── 1. Direct Messages ────────────────────────────────────────────────────
  const imList = await client.conversations.list({ types: 'im', limit: 20 })
  const dmChannels = imList.channels ?? []

  for (const channel of dmChannels.slice(0, 10)) {
    if (!channel.id) continue
    try {
      const history = await client.conversations.history({
        channel: channel.id,
        oldest,
        limit: 20,
      })

      for (const msg of history.messages ?? []) {
        if (!msg.text || msg.user === myUserId) continue

        messages.push({
          ts: msg.ts ?? '',
          channel: channel.id,
          userId: msg.user ?? '',
          text: msg.text,
          threadTs: msg.thread_ts,
          isDirectMessage: true,
          isMention: false,
        })
      }
    } catch {
      // Skip on per-channel failure (e.g., missing permissions)
    }
  }

  // ── 2. @Mentions via search ───────────────────────────────────────────────
  try {
    const searchRes = await client.search.messages({
      query: `<@${myUserId}> after:${new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString().split('T')[0]}`,
      count: 20,
    })

    const searchMessages = searchRes.messages?.matches ?? []

    for (const msg of searchMessages) {
      messages.push({
        ts: msg.ts ?? '',
        channel: msg.channel?.id ?? '',
        channelName: msg.channel?.name,
        userId: msg.user ?? '',
        userName: msg.username,
        text: msg.text ?? '',
        threadTs: (msg as Record<string, unknown>).thread_ts as string | undefined,
        isDirectMessage: false,
        isMention: true,
        permalink: msg.permalink,
      })
    }
  } catch (err) {
    // search:read may not be available on all plans
    console.warn('Slack search failed (may need search:read scope):', err)
  }

  // Deduplicate by ts
  const seen = new Set<string>()
  return messages.filter(m => {
    if (seen.has(m.ts)) return false
    seen.add(m.ts)
    return true
  })
}
