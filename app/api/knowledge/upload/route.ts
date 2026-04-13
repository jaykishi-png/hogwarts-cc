import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

const SUPPORTED_EXTENSIONS = /\.(pdf|docx?|txt|md|csv|json|html?)$/i

export async function POST(req: NextRequest) {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID
    if (!vectorStoreId) {
      return NextResponse.json(
        { error: 'Knowledge base not initialised. Open the Knowledge panel and click "Initialise".' },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate extension
    if (!SUPPORTED_EXTENSIONS.test(file.name)) {
      return NextResponse.json(
        { error: `Unsupported file type. Use PDF, DOCX, TXT, MD, CSV, or JSON.` },
        { status: 400 }
      )
    }

    const mimeType = file.type || 'application/octet-stream'
    const buffer = Buffer.from(await file.arrayBuffer())
    const openaiFile = await toFile(buffer, file.name, { type: mimeType })

    // Upload to OpenAI Files API
    const uploaded = await openai.files.create({
      file: openaiFile,
      purpose: 'assistants',
    })

    // Attach to vector store (indexing happens asynchronously)
    await openai.vectorStores.files.create(vectorStoreId, {
      file_id: uploaded.id,
    })

    return NextResponse.json({
      fileId: uploaded.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType,
      status: 'processing',
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
