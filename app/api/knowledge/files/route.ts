import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { VectorStoreFile } from 'openai/resources/vector-stores/files'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── GET — list all files in the vector store ──────────────────────────────────
export async function GET() {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
    if (!vectorStoreId) return NextResponse.json({ files: [], total: 0 })

    const vsFiles = await openai.vectorStores.files.list(vectorStoreId, { limit: 100 })

    const files = await Promise.all(
      vsFiles.data.map(async (vsFile: VectorStoreFile) => {
        try {
          const info = await openai.files.retrieve(vsFile.id)
          return {
            id: vsFile.id,
            name: info.filename,
            size: info.bytes,
            status: vsFile.status,
            createdAt: info.created_at,
          }
        } catch {
          return {
            id: vsFile.id,
            name: 'Unknown file',
            size: 0,
            status: vsFile.status,
            createdAt: 0,
          }
        }
      })
    )

    // Sort newest first
    files.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ files, total: files.length })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── DELETE — remove a file from the vector store and OpenAI Files ─────────────
export async function DELETE(req: NextRequest) {
  try {
    const { fileId } = await req.json() as { fileId: string }
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
    if (!vectorStoreId) return NextResponse.json({ error: 'Not configured' }, { status: 400 })

    // Remove from vector store (requires vector_store_id param)
    await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId })
    // Delete the underlying OpenAI file
    await openai.files.delete(fileId)

    return NextResponse.json({ success: true, fileId })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
