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
    courseTitle:          string
    courseLevel:          string
    lessonTitle:          string
    moduleNum:            string  // already zero-padded: "01", "02" …
    lessonNum:            string  // already zero-padded
    footerLine2Override?: string  // replaces "Module X | Lesson Y" entirely
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

  // 2. Replace all placeholders in two separate batchUpdate calls.
  //
  //    ORDERING IS CRITICAL: {{COURSE_TITLE}} must go LAST.
  //
  //    When Google Docs replaces a placeholder mid-run, it splits that run at
  //    the replacement boundary. Any remaining placeholder text in the same run
  //    (e.g. {{COURSE LEVEL}} after {{COURSE_TITLE}}) may end up split across
  //    two new runs and become unsearchable by a subsequent replaceAllText.
  //
  //    Call A: body copy + every placeholder EXCEPT COURSE_TITLE (both variants).
  //    Call B: COURSE_TITLE only (both variants), after all other runs are clean.
  //
  //    This ensures {{COURSE LEVEL}} (space variant) is always found in-run
  //    before any COURSE_TITLE replacement can fragment it.
  const { courseTitle, courseLevel, lessonTitle, moduleNum, lessonNum, footerLine2Override } = opts.footer

  // Call A — body + all non-COURSE_TITLE placeholders (underscore + space variants).
  //
  // When footerLine2Override is set (intro / outro files), we replace the static
  // "Module " prefix and " | Lesson " separator with empty strings and put the
  // override text into the {{MODULE_NUM}} slot — leaving no stray literal text.
  const moduleLine2Requests = footerLine2Override
    ? [
        // Underscore variants
        { replaceAllText: { containsText: { text: 'Module ',        matchCase: true }, replaceText: ''                   } },
        { replaceAllText: { containsText: { text: '{{MODULE_NUM}}', matchCase: true }, replaceText: footerLine2Override  } },
        { replaceAllText: { containsText: { text: ' | Lesson ',     matchCase: true }, replaceText: ''                   } },
        { replaceAllText: { containsText: { text: '{{LESSON_NUM}}', matchCase: true }, replaceText: ''                   } },
        // Space variants
        { replaceAllText: { containsText: { text: '{{MODULE NUM}}', matchCase: true }, replaceText: footerLine2Override  } },
        { replaceAllText: { containsText: { text: '{{LESSON NUM}}', matchCase: true }, replaceText: ''                   } },
      ]
    : [
        { replaceAllText: { containsText: { text: '{{MODULE_NUM}}', matchCase: true }, replaceText: moduleNum } },
        { replaceAllText: { containsText: { text: '{{MODULE NUM}}', matchCase: true }, replaceText: moduleNum } },
        { replaceAllText: { containsText: { text: '{{LESSON_NUM}}', matchCase: true }, replaceText: lessonNum } },
        { replaceAllText: { containsText: { text: '{{LESSON NUM}}', matchCase: true }, replaceText: lessonNum } },
      ]

  const resA = await docs.documents.batchUpdate({
    documentId:  docId,
    requestBody: {
      requests: [
        { replaceAllText: { containsText: { text: '{{BODY_COPY}}',    matchCase: true }, replaceText: formatTranscript(opts.transcript) } },
        { replaceAllText: { containsText: { text: '{{COURSE_LEVEL}}', matchCase: true }, replaceText: courseLevel  } },
        { replaceAllText: { containsText: { text: '{{COURSE LEVEL}}', matchCase: true }, replaceText: courseLevel  } },
        { replaceAllText: { containsText: { text: '{{LESSON_TITLE}}', matchCase: true }, replaceText: lessonTitle  } },
        { replaceAllText: { containsText: { text: '{{LESSON TITLE}}', matchCase: true }, replaceText: lessonTitle  } },
        ...moduleLine2Requests,
      ],
    },
  });
  const phLabels = footerLine2Override
    ? ['{{BODY_COPY}}','{{COURSE_LEVEL}}','{{COURSE LEVEL}}','{{LESSON_TITLE}}','{{LESSON TITLE}}','Module ','{{MODULE_NUM}}(override)',' | Lesson ','{{LESSON_NUM}}','{{MODULE NUM}}(override)','{{LESSON NUM}}']
    : ['{{BODY_COPY}}','{{COURSE_LEVEL}}','{{COURSE LEVEL}}','{{LESSON_TITLE}}','{{LESSON TITLE}}','{{MODULE_NUM}}','{{MODULE NUM}}','{{LESSON_NUM}}','{{LESSON NUM}}']
  phLabels.forEach((ph, i) => console.log(`[transcript-to-doc] A[${i}] "${ph}" → ${resA.data.replies?.[i]?.replaceAllText?.occurrencesChanged ?? 0}`))

  // Call B — COURSE_TITLE last (both variants), after no other placeholders remain in those runs
  const resB = await docs.documents.batchUpdate({
    documentId:  docId,
    requestBody: {
      requests: [
        { replaceAllText: { containsText: { text: '{{COURSE_TITLE}}', matchCase: true }, replaceText: courseTitle  } },
        { replaceAllText: { containsText: { text: '{{COURSE TITLE}}', matchCase: true }, replaceText: courseTitle  } },
      ],
    },
  });
  ['{{COURSE_TITLE}}','{{COURSE TITLE}}']
    .forEach((ph, i) => console.log(`[transcript-to-doc] B[${i}] "${ph}" → ${resB.data.replies?.[i]?.replaceAllText?.occurrencesChanged ?? 0}`))

  return {
    docId,
    docUrl: `https://docs.google.com/document/d/${docId}/edit`,
  }
}
