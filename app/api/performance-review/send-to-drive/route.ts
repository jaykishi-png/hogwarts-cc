import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export const maxDuration = 60

// ─── Target folder ────────────────────────────────────────────────────────────
const PERF_REVIEW_FOLDER_ID = '1vj8HSp0QnBlfwCoLvtzz-z3uJkh_84hg'

// ─── Auth (same pattern as transcript-to-doc) ────────────────────────────────
function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN })
  return auth
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompetencyEntry {
  competency: string
  examples: [string, string, string]
}
interface GoalEntry {
  text: string
  status: string
  explanation: string
}
interface NextGoal {
  text: string
  targetDate: string
}

// ─── Segment builder ──────────────────────────────────────────────────────────
// Each segment describes a chunk of text and its formatting.
interface Segment {
  text: string
  bold?: boolean
  italic?: boolean
  fontSize?: number
  namedStyle?: 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'NORMAL_TEXT'
}

// ─── Build segments from form data ───────────────────────────────────────────
function buildSegments(form: {
  employeeName: string
  employeePosition: string
  employeeDivision: string
  supervisorName: string
  appraisalPeriod: string
  reviewDate: string
  competencyOne: CompetencyEntry
  competencyTwo: CompetencyEntry
  competencyThree: CompetencyEntry
  competencyFour: CompetencyEntry
  competencyFive: CompetencyEntry
  competencyFiveType: 'positive' | 'constructive'
  goals: GoalEntry[]
  overallScore: number
  overallSummary: string
  nextGoals: NextGoal[]
}): Segment[] {
  const segs: Segment[] = []

  const add = (text: string, opts: Omit<Segment, 'text'> = {}) => segs.push({ text, ...opts })
  const ln = (text = '') => add(text + '\n')
  const bold = (text: string) => add(text, { bold: true })
  const boldLn = (text: string, opts: Omit<Segment, 'text' | 'bold'> = {}) => add(text + '\n', { bold: true, ...opts })

  const SCORE_LABELS: Record<number, string> = {
    1: 'Unsatisfactory',
    2: 'Needs Improvement',
    3: 'Meets Expectations',
    4: 'Exceeds Job Requirements',
    5: 'Outstanding',
  }

  const PREAMBLE = `All employees will have an annual performance review on or around the date of their work anniversary. It is with every intention that the Company will have periodic check-ins to ensure performance is, at minimum, meeting expectations and goal objectives are being met. All employees have the option to request a check-in at their discretion during the review period. However, this does not mean a formal review will be facilitated. Merit increases are determined by several factors including financial health, Company profitability, job performance, and consumer price index. A positive performance review does not guarantee a pay raise or continued employment.`

  const PART_ONE_INTRO = `Identify 5-words from the drop-down menu that accurately describe your employee's performance during the relevant review period. Consider what is working about their performance and where improvements can be made. You will need to identify 2-3 positive areas and 2-3 constructive areas for improvement. At least one (1) but no more than three (3) explanations should be provided for each respective word. Please review the Glossary of Terms for the definition of each term.`

  const PART_TWO_INTRO = `If the employee had goals and objectives previously determined, indicate their progress and the successful or unsuccessful completion of the goals or objectives and the reason WHY you felt they have successfully or unsuccessfully fulfilled their growth initiatives. List any accomplishments made, either within their goal and objective roadmap or as stand-alone accomplishments. Use the Manager's Guide To Performance Reviews to help you form your evaluation.`

  const PART_THREE_INTRO = `Toward the end of the evaluation discussion, work on at least two (2) goals for the employee to meet for the next review period. Discuss roadmaps on how the employee plans to get there and hold them to it. It will be helpful to reference page two of the Managers Guide to Performance Evaluations to help identify, define, and craft goals and objectives using the SMART goal method.`

  // ── Title ──────────────────────────────────────────────────────────────────
  add('ANNUAL PERFORMANCE REVIEW\n', { namedStyle: 'HEADING_1', bold: true })
  ln()

  // ── Policy statement ───────────────────────────────────────────────────────
  add(PREAMBLE + '\n', { italic: true, fontSize: 9 })
  ln()

  // ── Header fields ──────────────────────────────────────────────────────────
  const fields: [string, string][] = [
    ['Employee Name', form.employeeName || ''],
    ['Employee Position', form.employeePosition || ''],
    ['Employee Division', form.employeeDivision || ''],
    ['Supervisor Name', form.supervisorName || ''],
    ['Appraisal Period', form.appraisalPeriod || ''],
    ['Review Date', form.reviewDate || ''],
  ]
  for (const [label, value] of fields) {
    bold(`${label}:  `)
    ln(value)
  }
  ln()

  // ── PART ONE ────────────────────────────────────────────────────────────────
  add('PART ONE\n', { namedStyle: 'HEADING_2', bold: true })
  add(PART_ONE_INTRO + '\n', { fontSize: 10 })
  ln()
  add('COMPETENCY EVALUATION\n', { namedStyle: 'HEADING_3', bold: true })
  ln()

  const compEntries = [
    { entry: form.competencyOne,   ordinal: 'ONE',   typeLabel: 'positive' },
    { entry: form.competencyTwo,   ordinal: 'TWO',   typeLabel: 'positive' },
    { entry: form.competencyThree, ordinal: 'THREE', typeLabel: 'constructive' },
    { entry: form.competencyFour,  ordinal: 'FOUR',  typeLabel: 'constructive' },
    { entry: form.competencyFive,  ordinal: 'FIVE',  typeLabel: form.competencyFiveType },
  ]

  for (const { entry, ordinal, typeLabel } of compEntries) {
    boldLn(`COMPETENCY ${ordinal} (${typeLabel}): ${entry.competency || 'SELECT ONE'}`)
    boldLn('EXPLANATION:')
    for (let i = 0; i < 3; i++) {
      ln(`${i + 1}. ${entry.examples[i]?.trim() || '[INSERT EXAMPLE]'}`)
    }
    ln()
  }

  // ── PART TWO ────────────────────────────────────────────────────────────────
  add('PART TWO\n', { namedStyle: 'HEADING_2', bold: true })
  add(PART_TWO_INTRO + '\n', { fontSize: 10 })
  ln()
  add('GOALS, OBJECTIVES, ACCOMPLISHMENTS\n', { namedStyle: 'HEADING_3', bold: true })
  add(`Goals/Objectives/Accomplishments: Evaluate the goals and objectives that were met and any accomplishments that have been made over the relevant review period. Indicate whether the goals and objectives were successful/unsuccessful and why:\n`, { italic: true, fontSize: 10 })
  ln()

  const filledGoals = form.goals.filter(g => g.text.trim())
  if (filledGoals.length === 0) {
    for (let i = 1; i <= 5; i++) ln(`${i}.`)
  } else {
    filledGoals.forEach((g, i) => {
      const status = g.status ? ` — ${g.status.toUpperCase()}` : ''
      bold(`${i + 1}. `)
      add(`${g.text.trim()}${status}\n`)
      if (g.explanation.trim()) {
        add(`   ${g.explanation.trim()}\n`, { italic: true, fontSize: 10 })
      }
      ln()
    })
    // Remaining blank slots
    for (let i = filledGoals.length + 1; i <= 5; i++) ln(`${i}.`)
  }
  ln()

  // Overall score
  add('OVERALL PERFORMANCE EVALUATION SUMMARY:\n', { bold: true, namedStyle: 'HEADING_3' })
  add('Please reference the Managers Guide to performance reviews for the scoring matrix definitions.\n', { italic: true, fontSize: 10 })
  ln()
  if (form.overallScore > 0) {
    const label = SCORE_LABELS[form.overallScore] ?? ''
    boldLn(`OVERALL SCORE:  ${form.overallScore} — ${label}`)
    if (form.overallSummary.trim()) {
      add(form.overallSummary.trim() + '\n', { fontSize: 10 })
    }
  } else {
    ln('OVERALL SCORE:  [Not scored]')
  }
  ln()

  // ── PART THREE ──────────────────────────────────────────────────────────────
  add("PART THREE\n", { namedStyle: 'HEADING_2', bold: true })
  add(PART_THREE_INTRO + '\n', { fontSize: 10 })
  ln()
  add("Next Year's Goals and Objectives for Future Development: Work on these with the employee and identify anticipated completion dates. These goals and objectives should be included in the following years' evaluation appraisal period.\n", { italic: true, fontSize: 10 })
  ln()

  for (let i = 0; i < 3; i++) {
    const g = form.nextGoals[i]
    if (g?.text.trim()) {
      bold(`${i + 1}.  `)
      ln(g.text.trim())
      if (g.targetDate.trim()) {
        add(`   Target Date: ${g.targetDate.trim()}\n`, { italic: true, fontSize: 10 })
      }
      ln()
    } else {
      ln(`${i + 1}.`)
      ln()
    }
  }

  // ── Signature lines ─────────────────────────────────────────────────────────
  ln()
  ln()
  add('__________________________________', {})
  add('                                ', {})
  add('_______________\n', {})
  ln('Employee Name                                                        Date Signed')
  ln()
  ln()
  add('__________________________________\n', {})
  ln('Employee Signature')
  ln()

  // ── Employee Comments ────────────────────────────────────────────────────────
  add('EMPLOYEE COMMENTS\n', { namedStyle: 'HEADING_3', bold: true })
  ln()

  return segs
}

// ─── Convert segments → Docs API batchUpdate requests ────────────────────────
function buildRequests(segments: Segment[]) {
  // Build the full text string and record per-segment offsets
  let fullText = ''
  const offsets: { start: number; end: number; seg: Segment }[] = []

  for (const seg of segments) {
    const start = fullText.length
    fullText += seg.text
    offsets.push({ start, end: fullText.length, seg })
  }

  // In a new Google Doc, text starts at index 1 (doc has one `\n` at index 1)
  // Inserting at index 1 shifts that final `\n` to end.
  const BASE = 1 // docs API base index

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests: any[] = []

  // 1. Insert all text at once
  requests.push({
    insertText: {
      location: { index: BASE },
      text: fullText,
    },
  })

  // 2. Paragraph styles (namedStyle) — must cover the \n at the end of the line
  for (const { start, end, seg } of offsets) {
    if (!seg.namedStyle) continue
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: BASE + start,
          endIndex:   BASE + end,
        },
        paragraphStyle: { namedStyleType: seg.namedStyle },
        fields: 'namedStyleType',
      },
    })
  }

  // 3. Text styles (bold / italic / fontSize)
  for (const { start, end, seg } of offsets) {
    // Only apply if any style property is set
    if (!seg.bold && !seg.italic && !seg.fontSize) continue

    // Don't style the trailing newline character (last char) for text runs
    const styleEnd = end

    const textStyle: Record<string, unknown> = {}
    const fieldsList: string[] = []

    if (seg.bold !== undefined) { textStyle.bold = seg.bold;     fieldsList.push('bold') }
    if (seg.italic !== undefined) { textStyle.italic = seg.italic; fieldsList.push('italic') }
    if (seg.fontSize !== undefined) {
      textStyle.fontSize = { magnitude: seg.fontSize, unit: 'PT' }
      fieldsList.push('fontSize')
    }

    if (fieldsList.length === 0) continue

    requests.push({
      updateTextStyle: {
        range: {
          startIndex: BASE + start,
          endIndex:   BASE + styleEnd,
        },
        textStyle,
        fields: fieldsList.join(','),
      },
    })
  }

  return requests
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const form = await req.json()

    // Build doc title: EmployeeName_AnnualPerformanceReview_Manager_AppraisalPeriod
    const safeName    = (form.employeeName || 'Employee').replace(/\s+/g, '')
    const safePeriod  = (form.appraisalPeriod || '').replace(/\s*[–—]\s*/g, '-').replace(/\s*-\s*/g, '-').trim() || 'UnknownPeriod'
    const docTitle    = `${safeName}_AnnualPerformanceReview_Manager_${safePeriod}`

    const auth  = getAuth()
    const drive = google.drive({ version: 'v3', auth })
    const docs  = google.docs({ version: 'v1', auth })

    // 1. Create a blank Google Doc in the target folder
    const createRes = await drive.files.create({
      requestBody: {
        name:     docTitle,
        mimeType: 'application/vnd.google-apps.document',
        parents:  [PERF_REVIEW_FOLDER_ID],
      },
      fields: 'id',
    })

    const docId = createRes.data.id
    if (!docId) throw new Error('Drive file creation returned no document ID.')

    // 2. Build content segments and Docs API requests
    const segments = buildSegments(form)
    const requests = buildRequests(segments)

    // 3. Apply content + formatting in one batchUpdate
    await docs.documents.batchUpdate({
      documentId:  docId,
      requestBody: { requests },
    })

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`

    return NextResponse.json({ docId, docUrl, docTitle })
  } catch (err) {
    console.error('[send-to-drive]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
