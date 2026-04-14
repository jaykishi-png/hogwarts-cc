import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    const token = process.env.FRAMEIO_TOKEN
    if (!token) {
      return NextResponse.json({ error: 'FRAMEIO_TOKEN not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    // Step 1: Get accounts
    const accountsRes = await fetch('https://api.frame.io/v4/accounts', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    if (!accountsRes.ok) throw new Error(`Frame.io accounts: ${accountsRes.status}`)
    const accountsData = await accountsRes.json()
    const accountId = accountsData.data?.[0]?.id ?? accountsData[0]?.id
    if (!accountId) return NextResponse.json({ projects: [], assets: [] })

    // Step 2: Get projects for account
    const projRes = await fetch(`https://api.frame.io/v4/accounts/${accountId}/projects?page_size=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const projData = await projRes.json()
    const projects = (projData.data ?? projData ?? []).map((p: Record<string, unknown>) => ({
      id: p.id, name: p.name, assetCount: p.asset_count ?? 0,
    }))

    if (!projectId) return NextResponse.json({ projects, assets: [] })

    // Step 3: Get assets for selected project
    const assetsRes = await fetch(`https://api.frame.io/v4/projects/${projectId}/assets?page_size=20&type=file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const assetsData = await assetsRes.json()
    const assets = (assetsData.data ?? assetsData ?? []).map((a: Record<string, unknown>) => ({
      id: a.id,
      name: a.name,
      type: a.filetype ?? a.type ?? 'file',
      thumb: a.thumb ?? (a.thumbnails as Record<string, string> | undefined)?.['640'],
      commentCount: a.comment_count ?? 0,
      status: a.label ?? 'none',
      reviewLink: a.short_url ?? `https://app.frame.io/reviews/${a.id}`,
      updatedAt: a.updated_at,
    }))

    return NextResponse.json({ projects, assets })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
