import { NextRequest, NextResponse } from 'next/server'
import { createDriveFolder } from '@/lib/integrations/google-docs'

export const maxDuration = 15

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json() as { name: string }
    if (!name?.trim()) return NextResponse.json({ error: 'Folder name required.' }, { status: 400 })

    const result = await createDriveFolder(name.trim())
    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('[drive-folder]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
