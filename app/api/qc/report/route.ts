import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { fileName, duration, visualFindings, transcript, jumpCuts } = await req.json() as {
      fileName:       string
      duration:       number
      visualFindings: string[]
      transcript:     string
      jumpCuts:       number[]
    }

    const allVisual = visualFindings.filter(Boolean).join('\n').trim()
    const jumpBlock = jumpCuts.length
      ? jumpCuts.map(t => `${t}s`).join(', ')
      : 'None detected'

    const audioPrompt = transcript
      ? `Analyse this transcript for:
1. Filler words (um, uh, like, you know) — count and flag if > 5
2. Repeated phrases (possible edit loop — exact duplicated sentences)
3. Abrupt sentence cut-offs (jump cut indicator)
4. Inaudible / [silence] / [crosstalk] markers
5. Factual errors, wrong names, garbled numbers

Transcript:
${transcript.slice(0, 6000)}`
      : 'No transcript available.'

    // Run audio QC in parallel with report synthesis
    let audioFindings = '_No transcript available._'
    if (transcript) {
      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: audioPrompt }],
        max_tokens: 700,
      })
      audioFindings = audioRes.choices[0].message.content ?? audioFindings
    }

    const mins = Math.floor(duration / 60)
    const secs = Math.floor(duration % 60)
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`

    const report = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are HARRY, a senior video editor and creative review agent. Write precise, professional QC reports in markdown.`,
        },
        {
          role: 'user',
          content: `Write a QC report for "${fileName}" (duration: ${durationStr}).

## Visual Findings (frame-by-frame, 1fps sampling)
${allVisual || 'No visual issues detected across all frames.'}

## Jump Cuts Detected
${jumpBlock}

## Audio / Transcript Analysis
${audioFindings}

---
Use this exact structure:

# QC Report — ${fileName}

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)
**Duration:** ${durationStr} · **Frames analysed:** ~${Math.floor(duration)} frames (1fps)

---

## Visual
[Summarise all visual findings with timestamps. Group by type: Typos, Exposure, Color, Framing, Artifacts. If none: "No visual issues detected."]

## Jump Cuts
[List each detected jump cut with timestamp. Note whether each looks intentional (edit) or accidental. If none: "No unexpected jump cuts detected."]

## Audio
[Summarise transcript QC findings. If no transcript: note it and recommend manual audio review.]

## Recommended Actions
- [Specific, actionable bullet list. If no issues: "No actions required — file is ready for delivery."]

---
*Analysed at 1 frame/second. Jump cuts detected via consecutive-frame pixel difference (threshold 12%).*`,
        },
      ],
      max_tokens: 1200,
    })

    return NextResponse.json({ report: report.choices[0].message.content ?? '(no report)' })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
