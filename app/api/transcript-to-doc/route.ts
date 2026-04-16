import { NextRequest, NextResponse } from 'next/server'
import { createTranscriptDoc } from '@/lib/integrations/google-docs'
import { TRANSCRIPT_TEMPLATES } from '@/config/transcript-templates'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const {
      templateKey,
      courseTitle,
      courseLevel,
      lessonTitle,
      moduleNum,
      lessonNum,
      transcript,
      folderId,
    } = await req.json() as {
      templateKey:  string
      courseTitle?: string   // overrides the template's default courseTitle when provided
      courseLevel:  string
      lessonTitle:  string
      moduleNum:    string
      lessonNum:    string
      transcript:   string
      folderId?:    string
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'No transcript provided.' }, { status: 400 })
    }

    const template = TRANSCRIPT_TEMPLATES.find(t => t.key === templateKey)
    if (!template) {
      return NextResponse.json({ error: `Unknown template key: ${templateKey}` }, { status: 400 })
    }

    // Zero-pad module and lesson numbers: "1" → "01"
    const pad = (n: string) => n.trim().padStart(2, '0')
    const paddedModule = pad(moduleNum)
    const paddedLesson = pad(lessonNum)

    const docTitle = `${template.key} M${paddedModule}L${paddedLesson} Transcript`

    const result = await createTranscriptDoc({
      templateId: template.templateId,
      docTitle,
      transcript: transcript.trim(),
      footer: {
        courseTitle: courseTitle?.trim() || template.courseTitle,
        courseLevel: (courseLevel.trim() || 'Beginner'),
        lessonTitle: lessonTitle.trim(),
        moduleNum:   paddedModule,
        lessonNum:   paddedLesson,
      },
      folderId,
    })

    return NextResponse.json({ docUrl: result.docUrl, docTitle })
  } catch (err: unknown) {
    console.error('[transcript-to-doc]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
