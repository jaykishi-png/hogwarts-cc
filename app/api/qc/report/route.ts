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

/** Safety-net: normalise any stray timecode formats the model emits → [TC: HH:MM:SS:FF] */
function normalizeTCs(text: string, fps: number = 24): string {
  return text
    .replace(/\[(\d+)m\s*(\d+)s\]/g,          (_, m, s)  => `[TC: ${secondsToTC(+m * 60 + +s, fps)}]`)
    .replace(/\[(\d+)m\]/g,                    (_, m)     => `[TC: ${secondsToTC(+m * 60, fps)}]`)
    .replace(/\[(\d+)s[-\u2013](\d+)s\]/g,    (_, s1)    => `[TC: ${secondsToTC(+s1, fps)}]`)
    .replace(/\[(\d+)s\]/g,                    (_, s)     => `[TC: ${secondsToTC(+s, fps)}]`)
    .replace(/(?<!\bTC: (?:\d{2}:){0,2})\[(\d{1,2}):(\d{2})\](?!:\d)/g,
             (_, m, s) => `[TC: ${secondsToTC(+m * 60 + +s, fps)}]`)
}

export async function POST(req: NextRequest) {
  try {
    const {
      fileName,
      duration,
      visualFindings,
      transcript,
      segments,
      audioQualityFindings,
      fps = 24,
    } = await req.json() as {
      fileName:             string
      duration:             number
      visualFindings:       string[]
      transcript:           string
      segments?:            Segment[]
      audioQualityFindings?: string[]
      jumpCuts?:            number[]  // accepted but not forwarded — AI Vision is the sole source of truth
      fps?:                 number
    }

    const allVisual   = visualFindings.filter(Boolean).join('\n').trim()
    const allAudioQC  = normalizeTCs(
      (audioQualityFindings ?? []).filter(Boolean).join('\n').trim(),
      fps
    )

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

**CRITICAL TIMECODE RULE:** Every issue MUST begin with [TC: HH:MM:SS:FF] — example: [TC: 00:01:34:12]. NEVER use seconds notation like [94s] or [2m]. NEVER omit the TC prefix. Copy the timecode exactly from the transcript segments above.

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
      audioFindings = raw === 'AUDIO_CLEAN'
        ? '✅ No audio editing mistakes detected.'
        : normalizeTCs(raw, fps)
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
          content: `You are HARRY, a senior video editor and creative review agent. Write precise, professional QC reports in markdown.

TIMECODE RULES — ABSOLUTE:
- Every ⚠️ issue and every Recommended Action MUST include [TC: HH:MM:SS:FF].
- Copy timecodes EXACTLY from the findings — do NOT convert to seconds ([94s]) or minutes ([2m34s]).
- Format is always: [TC: HH:MM:SS:FF] — example: [TC: 00:01:34:12]
- Never omit the TC prefix. Never write bare numbers. No exceptions.`,
        },
        {
          role: 'user',
          content: `Write a QC report for "${fileName}" (duration: ${durationStr}, ${frameCount} frames analysed at 1fps, ${fps}fps source).

## Visual Findings (frame-by-frame GPT-4o Vision — AI-verified)
${allVisual || '✅ No visual issues detected across all frames.'}

## Audio Editing QC (Whisper + GPT-4o text analysis)
${audioFindings}

## Audio Quality QC (GPT-4o Audio — actual listening)
${allAudioQC || '✅ No audio quality issues detected.'}

---
Use this exact structure. Every ⚠️ issue MUST have [TC: HH:MM:SS:FF]. Every Recommended Action bullet MUST have [TC: HH:MM:SS:FF].

JUMP CUTS RULE: Do NOT create a separate "## Jump Cuts" section. Any confirmed jump cuts belong inside ## Visual under a "Jump Cuts" sub-heading. Only include jump cuts explicitly flagged in Visual Findings — never list raw timestamps as a jump cut inventory.

TIMECODE FORMAT RULE: Every single timecode in your output MUST use [TC: HH:MM:SS:FF] format. Example: [TC: 00:01:34:12]. If the source findings say [TC: 00:01:34:12], copy it exactly. NEVER shorten to [94s], [1m34s], [1:34], or any other format. This is non-negotiable.

# QC Report — ${fileName}

**Overall verdict:** ✅ PASS / ⚠️ REVIEW NEEDED / ❌ FAIL
**Reviewed by:** HARRY (Creative Review)
**Duration:** ${durationStr} · **Frames analysed:** ${frameCount} (1fps) · **Source FPS:** ${fps}

---

## Visual
[Summarise visual findings grouped by type. Use sub-headings only for categories that have issues: Typos, Exposure, Framing, Artifacts, Jump Cuts. Every issue: ⚠️ [TC: HH:MM:SS:FF] description — timecode in FULL HH:MM:SS:FF format, never shortened. If no visual issues: "✅ No visual issues detected."]

## Color
[Dedicated color grading section. List every color issue found, grouped into these sub-categories if present:
- **Color Shift** — inconsistent color temperature or tint between shots
- **Flat / Ungraded** — footage appears to be in log/RAW profile, ungraded, washed out
- **Color Drop** — saturation suddenly drops, image goes grey or desaturated
- **Skin Tones** — unnatural skin color
- **Color Cast** — unwanted tint
Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If no color issues: "✅ Color grading consistent throughout."]

## Audio — Editing
[Summarise audio editing findings from transcript analysis. Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If clean: "✅ No audio editing mistakes detected."]

## Audio — Quality
[Summarise audio quality findings from GPT-4o Audio listening pass. Group by type if multiple: Clipping, Background Noise, Hum, Pops/Clicks, Volume Jumps, Room Tone Shifts, Dropouts, Compression, Rumble, Mic Issues. Every issue: ⚠️ [TC: HH:MM:SS:FF] description. If clean: "✅ No audio quality issues detected."]

## Recommended Actions
- [TC: HH:MM:SS:FF] — [specific fix for that timecode. For color: "Re-grade shot", "Match color temp". For audio quality: "Fix clipping — reduce gain", "Add noise reduction", "Fix room tone cut — smooth with crossfade". For audio editing: describe the specific edit fix.]
(If no issues: "No actions required — file is ready for delivery.")

---
*Analysed at 1 frame/second · Jump cuts verified by AI against 30°/30% rule · Audio: Whisper whisper-1 (editing) + GPT-4o Audio (quality listening)*`,
        },
      ],
      max_tokens: 1800,
    })

    // Hard post-process: normalise any stray [Xs]/[Xm Ys] the model emits
    const finalReport = normalizeTCs(report.choices[0].message.content ?? '(no report)', fps)
    return NextResponse.json({ report: finalReport })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
