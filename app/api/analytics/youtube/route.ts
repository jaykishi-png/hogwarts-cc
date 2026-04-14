import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY
    const channelId = process.env.YOUTUBE_CHANNEL_ID

    if (!apiKey || !channelId) {
      return NextResponse.json({
        error: 'YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID env vars required',
        channel: null,
        videos: [],
      }, { status: 503 })
    }

    // Fetch channel stats
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
    )
    const statsData = await statsRes.json()
    const ch = statsData.items?.[0]
    const channel = ch ? {
      id: channelId,
      title: ch.snippet?.title,
      description: ch.snippet?.description?.slice(0, 120),
      thumbnail: ch.snippet?.thumbnails?.default?.url,
      subscribers: Number(ch.statistics?.subscriberCount ?? 0),
      views: Number(ch.statistics?.viewCount ?? 0),
      videoCount: Number(ch.statistics?.videoCount ?? 0),
    } : null

    // Fetch recent videos
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&key=${apiKey}`
    )
    const searchData = await searchRes.json()
    const videoIds = (searchData.items ?? []).map((v: Record<string, unknown>) => (v.id as Record<string, string>)?.videoId).filter(Boolean).join(',')

    let videos: unknown[] = []
    if (videoIds) {
      const vidRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
      )
      const vidData = await vidRes.json()
      videos = (vidData.items ?? []).map((v: Record<string, unknown>) => {
        const snip = v.snippet as Record<string, unknown>
        const stats = v.statistics as Record<string, string>
        return {
          id: v.id,
          title: snip?.title,
          thumbnail: (snip?.thumbnails as Record<string, Record<string, string>>)?.medium?.url,
          publishedAt: snip?.publishedAt,
          views: Number(stats?.viewCount ?? 0),
          likes: Number(stats?.likeCount ?? 0),
          comments: Number(stats?.commentCount ?? 0),
          url: `https://youtube.com/watch?v=${v.id}`,
        }
      })
    }

    return NextResponse.json({ channel, videos })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
