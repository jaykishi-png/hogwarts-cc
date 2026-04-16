import { google } from 'googleapis'

// ─── Transcript formatting ──────────────────────────────────────────────────
// Groups transcript sentences into readable paragraphs (~5 sentences each)
// separated by a blank line so the doc is easy to read.
function formatTranscript(text: string): string {
  if (!text.trim()) return text
  // Split on sentence boundaries: period/!/? followed by whitespace + capital letter
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z"'"])/g)
  const PER_PARA = 5
  const paragraphs: string[] = []
  for (let i = 0; i < sentences.length; i += PER_PARA) {
    paragraphs.push(sentences.slice(i, i + PER_PARA).join(' ').trim())
  }
  return paragraphs.join('\n\n')
}

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN })
  return auth
}

// ─── Create a Google Drive folder ──────────────────────────────────────────

export async function createDriveFolder(
  name: string,
  parentFolderId?: string,
): Promise<{ folderId: string; folderUrl: string }> {
  const auth  = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const requestBody: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentFolderId) requestBody.parents = [parentFolderId]

  const res = await drive.files.create({
    requestBody,
    fields: 'id',
  })

  const folderId = res.data.id
  if (!folderId) throw new Error('Drive folder creation returned no ID.')

  return {
    folderId,
    folderUrl: `https://drive.google.com/drive/folders/${folderId}`,
  }
}

// ─── Create a transcript doc from a template ───────────────────────────────

export interface CreateTranscriptDocOptions {
  templateId:  string
  docTitle:    string
  /** Replaces {{BODY_COPY}} — inherits the styling you gave that placeholder */
  transcript:  string
  footer: {
    courseTitle:  string
    courseLevel:  string
    lessonTitle:  string
    moduleNum:    string  // already zero-padded: "01", "02" …
    lessonNum:    string  // already zero-padded
  }
  /** If provided, the new doc is created directly inside this Drive folder */
  folderId?: string
}

export interface CreateTranscriptDocResult {
  docId:  string
  docUrl: string
}

export async function createTranscriptDoc(
  opts: CreateTranscriptDocOptions
): Promise<CreateTranscriptDocResult> {
  const auth  = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const docs  = google.docs({ version: 'v1', auth })

  // 1. Copy the template (optionally into a specific folder)
  const copyBody: Record<string, unknown> = { name: opts.docTitle }
  if (opts.folderId) copyBody.parents = [opts.folderId]

  const copyRes = await drive.files.copy({
    fileId:      opts.templateId,
    requestBody: copyBody,
  })
  const docId = copyRes.data.id
  if (!docId) throw new Error('Drive copy returned no document ID.')

  // 2. Replace all placeholders in one batchUpdate.
  // replaceAllText preserves the text style of the matched placeholder.
  // {{BODY_COPY}} is the required body placeholder; the others are optional
  // footer placeholders that will be replaced if the template includes them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = []

  const replacements: Record<string, string> = {
    '{{BODY_COPY}}':    formatTranscript(opts.transcript),
    '{{COURSE_TITLE}}': opts.footer.courseTitle,
    '{{COURSE_LEVEL}}': opts.footer.courseLevel,
    '{{LESSON_TITLE}}': opts.footer.lessonTitle,
    '{{MODULE_NUM}}':   opts.footer.moduleNum,
    '{{LESSON_NUM}}':   opts.footer.lessonNum,
  }

  for (const [placeholder, value] of Object.entries(replacements)) {
    requests.push({
      replaceAllText: {
        containsText: { text: placeholder, matchCase: true },
        replaceText:  value,
      },
    })
  }

  await docs.documents.batchUpdate({
    documentId:  docId,
    requestBody: { requests },
  })

  // 3. Append course metadata at the end of the document body.
  // We read the doc to find the current body end index, then insert
  // before the final newline. This is more reliable than page footers
  // because it doesn't depend on the template's footer structure.
  const docSnap  = await docs.documents.get({ documentId: docId })
  const bodyContent = docSnap.data.body?.content ?? []
  // The last structural element is always an implicit paragraph; inserting
  // at endIndex−1 places text before that final newline.
  const lastElem = bodyContent[bodyContent.length - 1]
  const insertAt = (lastElem?.endIndex ?? 2) - 1

  const meta =
    `\n\n${opts.footer.courseTitle}  |  ${opts.footer.courseLevel}\n` +
    `Module ${opts.footer.moduleNum}  |  Lesson ${opts.footer.lessonNum}\n` +
    opts.footer.lessonTitle

  await docs.documents.batchUpdate({
    documentId:  docId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: insertAt },
          text:      meta,
        },
      }],
    },
  })

  return {
    docId,
    docUrl: `https://docs.google.com/document/d/${docId}/edit`,
  }
}
