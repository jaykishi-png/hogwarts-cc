import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

// Frame.io v2 base (works with developer tokens starting fio-u-...)
// Frame.io v4 (Adobe IMS) tokens start with 'ey' (JWT) — auto-detected below
const FIO_V2 = 'https://api.frame.io/v2'
const FIO_V4 = 'https://api.frame.io/v4'

export async function GET(req: NextRequest) {
  try {
    const token = process.env.FRAMEIO_TOKEN
    if (!token) {
      return NextResponse.json({
        error: 'FRAMEIO_TOKEN not configured — add it to your Vercel environment variables',
        setup: true,
      }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    // Auto-detect API version: v4 JWT tokens start with "ey", legacy dev tokens start with "fio-u-"
    const isV4 = token.startsWith('ey')
    const base = isV4 ? FIO_V4 : FIO_V2

    if (isV4) {
      // ── Frame.io v4 (Adobe IMS) ────────────────────────────────────────────
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      const accountsRes = await fetch(`${base}/accounts`, { headers })
      if (!accountsRes.ok) {
        const body = await accountsRes.text().catch(() => '')
        throw new Error(`Frame.io v4 accounts: ${accountsRes.status}${body ? ' — ' + body.slice(0, 120) : ''}`)
      }
      const accountsData = await accountsRes.json()
      const accountId = accountsData.data?.[0]?.id
      if (!accountId) return NextResponse.json({ projects: [], assets: [] })

      const projRes = await fetch(`${base}/accounts/${accountId}/projects?page_size=20`, { headers })
      const projData = await projRes.json()
      const projects = (projData.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id, name: p.name, assetCount: p.asset_count ?? 0, updatedAt: p.updated_at,
      }))

      if (!projectId) return NextResponse.json({ projects, assets: [] })

      const assetsRes = await fetch(`${base}/projects/${projectId}/assets?page_size=30&type=file`, { headers })
      const assetsData = await assetsRes.json()
      const assets = mapAssets(assetsData.data ?? assetsData ?? [])
      return NextResponse.json({ projects, assets })

    } else {
      // ── Frame.io v2 (developer token fio-u-...) ───────────────────────────
      const headers = { Authorization: `Bearer ${token}` }

      // Get current user → team → projects
      const meRes = await fetch(`${FIO_V2}/me`, { headers })
      if (!meRes.ok) {
        const body = await meRes.text().catch(() => '')
        throw new Error(`Frame.io v2 /me: ${meRes.status}${body ? ' — ' + body.slice(0, 120) : ''}. Check your FRAMEIO_TOKEN is a valid developer token.`)
      }
      const me = await meRes.json()
      const teamId = me.account_id ?? me.teams?.[0]?.id ?? me.team_memberships?.[0]?.team_id

      if (!teamId) return NextResponse.json({ projects: [], assets: [] })

      const projRes = await fetch(`${FIO_V2}/teams/${teamId}/projects?page_size=20`, { headers })
      if (!projRes.ok) throw new Error(`Frame.io v2 projects: ${projRes.status}`)
      const projData = await projRes.json()
      const projects = (Array.isArray(projData) ? projData : projData.data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id, name: p.name, assetCount: (p as Record<string, unknown>).file_count ?? 0, updatedAt: p.updated_at,
      }))

      if (!projectId) return NextResponse.json({ projects, assets: [] })

      // Get root folder for project, then list children
      const projDetailRes = await fetch(`${FIO_V2}/projects/${projectId}`, { headers })
      const projDetail = await projDetailRes.json()
      const rootFolderId = projDetail.root_asset_id

      if (!rootFolderId) return NextResponse.json({ projects, assets: [] })

      const assetsRes = await fetch(`${FIO_V2}/assets/${rootFolderId}/children?page_size=30`, { headers })
      if (!assetsRes.ok) throw new Error(`Frame.io v2 assets: ${assetsRes.status}`)
      const assetsData = await assetsRes.json()
      const assets = mapAssetsV2(Array.isArray(assetsData) ? assetsData : assetsData.data ?? [])
      return NextResponse.json({ projects, assets })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

function mapAssets(items: Record<string, unknown>[]) {
  return items.map(a => ({
    id: a.id,
    name: a.name,
    type: String(a.filetype ?? a.type ?? 'file'),
    thumb: a.thumb ?? (a.thumbnails as Record<string, string> | undefined)?.['640'],
    commentCount: Number(a.comment_count ?? 0),
    status: String(a.label ?? 'none'),
    reviewLink: String(a.short_url ?? `https://app.frame.io/reviews/${a.id}`),
    updatedAt: a.updated_at,
  }))
}

function mapAssetsV2(items: Record<string, unknown>[]) {
  return items.map(a => ({
    id: a.id,
    name: a.name,
    type: String(a.type ?? a._type ?? 'file'),
    thumb: (a.transcodes as Record<string, string> | undefined)?.['h264_540'] ??
           (a.original as string | undefined),
    commentCount: Number(a.comment_count ?? 0),
    status: String(a.label ?? 'none'),
    reviewLink: `https://app.frame.io/reviews/${a.id}`,
    updatedAt: a.updated_at,
  }))
}
