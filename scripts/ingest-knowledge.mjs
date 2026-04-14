/**
 * Revenue Rush Knowledge Base Ingestion Script
 * ─────────────────────────────────────────────
 * • Recursively walks all 11 Google Drive folders
 * • Exports every Google Doc as plain text
 * • Uploads each to the OpenAI Vector Store
 * • Creates the Assistant + Vector Store if env vars are missing
 * • Writes the generated IDs back to .env.local
 */

import { google } from 'googleapis'
import OpenAI, { toFile } from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ── Load .env.local ────────────────────────────────────────────────────────────
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
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim()
    env[key] = val
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

// ── Clients ────────────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const auth = new google.auth.OAuth2(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET
)
auth.setCredentials({ refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN || env.GOOGLE_REFRESH_TOKEN })
const drive = google.drive({ version: 'v3', auth })

// ── Root folder IDs ────────────────────────────────────────────────────────────
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

// MIME types we can ingest (exported as plain text)
const EXPORTABLE = {
  'application/vnd.google-apps.document':      'text/plain',
  'application/vnd.google-apps.spreadsheet':   'text/csv',
  'application/vnd.google-apps.presentation':  'text/plain',
}

// ── Step 1: Setup / retrieve Vector Store + Assistant ─────────────────────────
async function ensureKnowledgeBase() {
  let vectorStoreId = env.OPENAI_VECTOR_STORE_ID
  let assistantId   = env.OPENAI_ASSISTANT_ID

  if (!vectorStoreId) {
    console.log('Creating new Vector Store…')
    const vs = await openai.vectorStores.create({ name: 'Revenue Rush Knowledge Base' })
    vectorStoreId = vs.id
    writeEnvValue(envPath, 'OPENAI_VECTOR_STORE_ID', vectorStoreId)
    console.log(`  ✓ Vector Store created: ${vectorStoreId}`)
  } else {
    console.log(`  ✓ Using existing Vector Store: ${vectorStoreId}`)
  }

  if (!assistantId) {
    console.log('Creating new Assistant…')
    const assistant = await openai.beta.assistants.create({
      name: 'Revenue Rush KB',
      instructions: `You are an expert knowledge base assistant for Revenue Rush. You have access to all Revenue Rush documents including strategies, campaigns, SOPs, briefs, data reports, and internal reference material.

When answering:
- Be precise and cite specific documents when possible
- Use structured responses with headers for complex questions
- If the answer is not in the documents, say "I don't have that in the knowledge base" clearly
- Keep answers concise but complete
- For numerical data, quote exactly from the source`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
    })
    assistantId = assistant.id
    writeEnvValue(envPath, 'OPENAI_ASSISTANT_ID', assistantId)
    console.log(`  ✓ Assistant created: ${assistantId}`)
  } else {
    console.log(`  ✓ Using existing Assistant: ${assistantId}`)
  }

  return { vectorStoreId, assistantId }
}

// ── Step 2: Recursively collect all exportable files ──────────────────────────
async function listFilesRecursive(folderId, folderPath = '', collected = []) {
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
    const files = res.data.files || []
    for (const file of files) {
      const fullPath = folderPath ? `${folderPath} / ${file.name}` : file.name
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        await listFilesRecursive(file.id, fullPath, collected)
      } else if (EXPORTABLE[file.mimeType]) {
        collected.push({ id: file.id, name: file.name, path: fullPath, mimeType: file.mimeType })
      }
    }
    pageToken = res.data.nextPageToken
  } while (pageToken)
  return collected
}

// ── Step 3: Export a file as text ─────────────────────────────────────────────
async function exportFile(file) {
  const exportMime = EXPORTABLE[file.mimeType]
  const res = await drive.files.export(
    { fileId: file.id, mimeType: exportMime, supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data)
}

// ── Step 4: Upload a buffer to the Vector Store ───────────────────────────────
async function uploadToVectorStore(vectorStoreId, buffer, fileName) {
  // Sanitise filename — OpenAI rejects names with slashes
  const safeName = fileName.replace(/[\/\\:*?"<>|]/g, '_').slice(0, 200) + '.txt'
  const openaiFile = await toFile(buffer, safeName, { type: 'text/plain' })
  const uploaded = await openai.files.create({ file: openaiFile, purpose: 'assistants' })
  await openai.vectorStores.files.create(vectorStoreId, { file_id: uploaded.id })
  return uploaded.id
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════')
  console.log(' Revenue Rush Knowledge Base Ingestion')
  console.log('═══════════════════════════════════════════════════\n')

  // 1. Ensure KB exists
  const { vectorStoreId } = await ensureKnowledgeBase()

  // 2. Collect all files across all 11 folders
  console.log('\n📂 Scanning folders…')
  const allFiles = []
  for (const folderId of ROOT_FOLDERS) {
    const before = allFiles.length
    await listFilesRecursive(folderId, '', allFiles)
    console.log(`  Folder ${folderId}: ${allFiles.length - before} docs found`)
  }
  console.log(`\n  Total exportable files: ${allFiles.length}`)

  if (allFiles.length === 0) {
    console.log('\n⚠️  No exportable Google Docs found. Check folder permissions.')
    return
  }

  // 3. Upload each file
  console.log('\n⬆️  Uploading to Vector Store…\n')
  let success = 0, skipped = 0, failed = 0
  const errors = []

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i]
    const prefix = `[${String(i + 1).padStart(3, ' ')}/${allFiles.length}]`
    const label = file.path.length > 60 ? '…' + file.path.slice(-57) : file.path

    try {
      const buffer = await exportFile(file)
      if (buffer.length < 20) {
        console.log(`  ${prefix} ⟳ SKIP (empty) — ${label}`)
        skipped++
        continue
      }
      await uploadToVectorStore(vectorStoreId, buffer, file.path)
      console.log(`  ${prefix} ✓ ${label}`)
      success++
    } catch (err) {
      const msg = String(err.message || err).slice(0, 80)
      console.log(`  ${prefix} ✗ ${label}\n           ${msg}`)
      errors.push({ file: file.path, error: msg })
      failed++
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300))
  }

  // 4. Summary
  console.log('\n═══════════════════════════════════════════════════')
  console.log(` ✅  Ingestion complete`)
  console.log(`     Uploaded : ${success}`)
  console.log(`     Skipped  : ${skipped}`)
  console.log(`     Failed   : ${failed}`)
  console.log(`\n     Vector Store : ${vectorStoreId}`)
  console.log(`\n     IDs saved to .env.local ✓`)
  console.log('═══════════════════════════════════════════════════\n')

  if (errors.length) {
    console.log('Failed files:')
    errors.forEach(e => console.log(`  • ${e.file}\n    ${e.error}`))
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
