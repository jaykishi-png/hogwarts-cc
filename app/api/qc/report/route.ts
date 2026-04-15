import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const maxDuration = 60

interface Segment { start: number; end: number; text: string }

/** Convert seconds → SMPTE HH:MM:SS:FF */
function secondsToTC(s: number, fps: number = 24): string {
  const totalFrames = Math.round(s * fps)
  const ff = totalFrames % fps
  const totalSecs = Math.floor(totalFrames / fps)
  const ss = totalSecs % 60
  const mm = Math.floor(totalSecs / 60) % 60
  const hh = Math.floor(totalSecs / 3600)
  return [hh, mm, ss, ff].map(n => n.toString().padStart(2, '0')).join(':')
}

export async function POST(req: NextRequest) {
  try {
    const {
      fileName,
      duration,
      visualFindings,
      transcript,
      segments,
      jumpCuts,
      fps = 24,
    } = await req.json() as {
      fileName:       string
      duration:       number
      visualFindings: string[]
      transcript:     string
      segments?:      Segment[]
      jumpCuts:       number[]
      fps?:           number
    }

    const allVisual = visualFindings.filter(Boolean).join('\n').trim()

    // Convert jump cuts to SMPTE
    const jumpBlock = jumpCuts.length
      ? jumpCuts.map(t => `[TC: ${secondsToTC(t, fps)}]`).join(', ')
      : 'None detected'

    // Build audio analysis content — prefer timestamped segments over plain text
    let audioQcContent: string
    if (segments && segments.length > 0) {
      const timestampedLines = segments
        .map(s => `[TC: ${secondsToTC(s.start, fps)}] ${s.text.trim()}`)
        .join('\n')
      audioQcContent = `Timestamped transcript (Whisper segments with SMPTE timecodes):\n${timestampedLines}`
    } else if (transcript) {
      audioQcContent = `Transcript (no per-segment timestamps):\n${transcript.slice(0, 6000)}`
    } else {
      audioQcContent = 'No transcript available.'
    }

    // Audio QC pass — focused on editing mistakes
    let audioFindings = '_No transcript available._'
    if (transcript || (segments && segments.length > 0)) {
      const audioRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `You are a senior video editor doing audio QC. Analyze this transcript for EDITING MISTAKES only.

**CRITICAL TIMECODE RULE:** Every issue you report MUST begin with [TC: HH:MM:SS:FF] using the timecode of the affected line. Never omit it.

Check for these audio editing mistakes:

**1. DIALOGUE CUT-OFF** — Words or sentences cut off mid-phrase. The speaker's audio was cut too early. Look for: words that end abruptly mid-syllable, incomplete sentences, missing sentence endings. Quote the cut-off line.

**2. AUDIO JUMP / ABRUPT TRANSITION** — Back-to-back segments where the audio cuts unnaturally between lines — the same speaker seems to jump, or there's an audible splice that breaks the flow. Look for consecutive lines that don't flow naturally.

**3. REPEATED PHRASE / EDIT LOOP** — Exact or near-exact sentence appearing twice in sequence. Indicates a duplicate clip or edit loop mistake.

**4. UNNATURAL GAP** — A clearly implied long silence or pause within what should be continuous speech (indicated by a timestamp gap > 2s between consecutive segments mid-sentence).

**5. FILLER WORD OVERLOAD** — If um/uh/like/you know appear more than 5 times, flag the first occurrence with timecode and note the total count. This indicates the editor may have missed cleanup passes.

**6. INAUDIBLE MARKERS** — Any [inaudible], [crosstalk], [silence], [music] markers that indicate audio problems.

Issue format (one line per issue):
[TC: HH:MM:SS:FF] TYPE: specific description — quote the problematic text

If no editing mistakes are found, respond exactly: AUDIO_CLEAN

${audioQcContent}`,
        }],
        max_tokens: 800,
      })
      const raw = audioRes.choices[0].message.content ?? ''
      audioFindings = raw === 'AUDIO_CLEAN' ? '✅ No audio editing mistakes detected.' : raw
    }

    const mins = Math.floor(duration / 60)
    const secs = Math.floor(duration % 60)
    const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`
    const frameCount = Math.floor(duration)

    const report = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are HARRY, a senior video editor and creative review agent. Write precise, professional QC reports in markdown. Every ⚠️ issue and every Recommended Action MUST include a [TC: HH:MM:SS:FF] timecode. No note without a timecode.`,
        },
        {
          role: 'user',
          content: `Write a QC report for "${fileName}" (duration: ${durationStr}, ${frameCount} frames analysed at 1fps, ${fps}fps source).

## Visual Findings (frame-by-frame GPT-4o Vision)
${allVisual || '✅ No visual issues detected across all frames.'}

## Jump Cut Candidates (pixel-diff detected, AI-verified above)
${jumpBlock}

## Audio Editing QC (Whisper + GPT-4o)
${audioFindings}

---
Use this exact structure. Every ⚠️ issue MUST have [TC: HH:MM:SS:FF]. Every Recommended Action bullet MUST have [TC: HH:MM:SS:FF].

# QC Report — ${fileName}

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)
**Duration:** ${durationStr} · **Frames analysed:** ${frameCount} (1fps) · **Source FPS:** ${fps}

---

## Visual
[Summarise visual findings grouped by type: Typos, Exposure, Framing, Artifacts, Jump Cuts. Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If clean: "✅ No visual issues detected."]

## Color
[Dedicated color grading section. List every color issue found, grouped into these sub-categories if present:
- **Color Shift** — inconsistent color temperature or tint between shots
- **Flat / Ungraded** — footage appears to be in log/RAW profile, ungraded, washed out
- **Color Drop** — saturation suddenly drops, image goes grey or desaturated
- **Skin Tones** — unnatural skin color
- **Color Cast** — unwanted tint
Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If no color issues: "✅ Color grading consistent throughout."]

## Audio
[Summarise audio editing findings. Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If clean: "✅ No audio editing mistakes detected."]

## Recommended Actions
- [TC: HH:MM:SS:FF] — [specific fix for that timecode. For color issues be explicit: e.g. "Re-grade shot — footage appears ungraded/flat", "Match color temperature to adjacent shot", "Saturation drops at this cut — check grade on clip"]
(If no issues: "No actions required — file is ready for delivery.")

---
*Analysed at 1 frame/second · Jump cuts verified by AI against 30°/30% rule · Audio via Whisper whisper-1 with segment timestamps*`,
        },
      ],
      max_tokens: 1400,
    })

    return NextResponse.json({ report: report.choices[0].message.content ?? '(no report)' })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
