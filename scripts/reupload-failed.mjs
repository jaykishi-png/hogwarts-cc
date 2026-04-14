/**
 * Re-upload the 3 files that failed ingestion due to size (500 errors).
 * Each file is exported as plain text, split into ~40 KB chunks,
 * and each chunk uploaded individually to the Vector Store.
 */

import { google } from 'googleapis'
import OpenAI, { toFile } from 'openai'
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

const env = loadEnv(envPath)

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
const vectorStoreId = env.OPENAI_VECTOR_STORE_ID

const auth = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
auth.setCredentials({ refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN || env.GOOGLE_REFRESH_TOKEN })
const drive = google.drive({ version: 'v3', auth })

// ── The 3 failed file names (partial match is fine) ───────────────────────────
const TARGETS = [
  'Video & Reels Creation Strategy',
  'ZR - TRANSCRIPT TEMPLATE',
  'Module 8 Transcript',
]

const EXPORTABLE = {
  'application/vnd.google-apps.document':     'text/plain',
  'application/vnd.google-apps.spreadsheet':  'text/csv',
  'application/vnd.google-apps.presentation': 'text/plain',
}

const ROOT_FOLDERS = [
  '1qdPh-aNksP5majLQuwn6DuKHm-aGxDds',
  '1UEw9iBf5XuOz7ORjMs-vyo-FWvr6e9mQ',
  '1n1KJZaUdm-OUFtlS8s_UB_W47mJ_e6CH',
  '1TsTZbDF3LHyK1RoCNwQrP2v7iSiK-m-u',
  '1d7XkDKcSEC7mm_r5qEmICAcKGhgZqh7V',
  '1X-gvZZ7H9j8sLl5w9kGC8eTm1J_71QFD',
  '1RqqH_o2vNV-4cfcJyj6EsrRg-dG4xDnw',
  '1wfP7xS7nXsdpSWHqnIagTamTUnrRfkO4',
  '1j1aI69BA3AaywAvsE4OFd_HSDMBetkbu',
  '1-V1hffJVCIHP4qBzBAHnA114hxr0YSgv',
  '1fQ9qJti-u0MEsbdOq9l7jRq1VkSvgMyf',
]

const CHUNK_SIZE = 40 * 1024 // 40 KB per chunk

async function findTargets(folderId, folderPath = '', found = []) {
  if (found.length === TARGETS.length) return found
  let pageToken = null
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 100,
      pageToken: pageToken || undefined,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })
    for (const file of (res.data.files || [])) {
      const fullPath = folderPath ? `${folderPath} / ${file.name}` : file.name
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await findTargets(file.id, fullPath, found)
      } else if (EXPORTABLE[file.mimeType] && TARGETS.some(t => file.name.includes(t))) {
        found.push({ id: file.id, name: file.name, path: fullPath, mimeType: file.mimeType })
        console.log(`  Found: ${fullPath}`)
      }
    }
    pageToken = res.data.nextPageToken
  } while (pageToken)
  return found
}

async function exportFile(file) {
  const exportMime = EXPORTABLE[file.mimeType]
  const res = await drive.files.export(
    { fileId: file.id, mimeType: exportMime, supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data)
}

function chunkBuffer(buffer, chunkSize) {
  const chunks = []
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize))
  }
  return chunks
}

async function uploadChunk(buffer, fileName) {
  const safeName = fileName.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 200) + '.txt'
  const openaiFile = await toFile(buffer, safeName, { type: 'text/plain' })
  const uploaded = await openai.files.create({ file: openaiFile, purpose: 'assistants' })
  await openai.vectorStores.files.create(vectorStoreId, { file_id: uploaded.id })
  return uploaded.id
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log(' Re-uploading 3 failed (oversized) files')
  console.log('═══════════════════════════════════════════════════\n')

  if (!vectorStoreId) {
    console.error('❌  OPENAI_VECTOR_STORE_ID not set in .env.local')
    process.exit(1)
  }

  console.log('🔍  Searching for target files…')
  const found = []
  for (const folderId of ROOT_FOLDERS) {
    await findTargets(folderId, '', found)
    if (found.length === TARGETS.length) break
  }

  if (found.length === 0) {
    console.log('\n⚠️  No matching files found. Check file names.')
    return
  }

  console.log(`\n  Found ${found.length} / ${TARGETS.length} target files.\n`)

  let totalChunks = 0, totalFailed = 0

  for (const file of found) {
    console.log(`\n📄  ${file.path}`)
    try {
      const buffer = await exportFile(file)
      console.log(`    Exported: ${(buffer.length / 1024).toFixed(1)} KB`)

      if (buffer.length < 20) {
        console.log('    ⟳ SKIP (empty)')
        continue
      }

      const chunks = chunkBuffer(buffer, CHUNK_SIZE)
      console.log(`    Splitting into ${chunks.length} chunk(s) of ~${(CHUNK_SIZE / 1024).toFixed(0)} KB…`)

      for (let i = 0; i < chunks.length; i++) {
        const chunkName = chunks.length === 1
          ? file.path
          : `${file.path} [part ${i + 1} of ${chunks.length}]`
        try {
          const fileId = await uploadChunk(chunks[i], chunkName)
          console.log(`    ✓ Chunk ${i + 1}/${chunks.length} uploaded (${fileId})`)
          totalChunks++
          await new Promise(r => setTimeout(r, 300))
        } catch (err) {
          console.log(`    ✗ Chunk ${i + 1} failed: ${String(err).slice(0, 100)}`)
          totalFailed++
        }
      }
    } catch (err) {
      console.log(`    ✗ Export failed: ${String(err).slice(0, 100)}`)
      totalFailed++
    }
  }

  console.log('\n═══════════════════════════════════════════════════')
  console.log(` ✅  Done`)
  console.log(`     Chunks uploaded : ${totalChunks}`)
  console.log(`     Chunks failed   : ${totalFailed}`)
  console.log(`     Vector Store    : ${vectorStoreId}`)
  console.log('═══════════════════════════════════════════════════\n')
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
