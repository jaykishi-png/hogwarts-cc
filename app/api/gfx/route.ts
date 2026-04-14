import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 120

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface GFXSection {
  timestamp: string
  topic: string
  gfxType: string
  description: string
  visualConcept: string
  imageUrl?: string
  imageError?: string
}

const ANALYZER_SYSTEM = `You are a motion graphics director and video editor. Given a video transcript or description, identify the best moments to add graphics/animations.

For each section, output a JSON array with objects containing:
- "timestamp": approximate time or section label (e.g., "0:30", "Intro", "Point 2")
- "topic": what is being discussed
- "gfxType": one of: "lower-third", "fullscreen-graphic", "callout-bubble", "data-viz", "b-roll-overlay", "title-card", "icon-animation", "list-reveal"
- "description": what the graphic should show/do (2-3 sentences)
- "visualConcept": a detailed DALL-E image prompt for a reference frame — flat, minimal, modern UI style with dark background. Be very specific about colors, layout, text, and visual elements.

Return ONLY a valid JSON array. No other text. Identify 5-8 sections maximum.`

export async function POST(req: NextRequest) {
  try {
    const { transcript, generateImages = true } = await req.json() as {
      transcript: string
      generateImages?: boolean
    }

    if (!transcript?.trim()) {
      return NextResponse.json({ error: 'transcript required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })

    // Step 1: Analyze transcript for GFX opportunities
    const analysisRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: ANALYZER_SYSTEM },
        { role: 'user', content: `Analyze this video content for GFX opportunities:\n\n${transcript.slice(0, 6000)}` },
      ],
    })

    const rawJson = analysisRes.choices[0]?.message?.content ?? '[]'
    let sections: GFXSection[] = []
    try {
      const cleaned = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      sections = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse GFX analysis', raw: rawJson }, { status: 500 })
    }

    if (!generateImages) {
      return NextResponse.json({ sections })
    }

    // Step 2: Generate reference images with DALL-E for each section
    const withImages = await Promise.allSettled(
      sections.slice(0, 6).map(async (section): Promise<GFXSection> => {
        try {
          const imgRes = await openai.images.generate({
            model: 'dall-e-3',
            prompt: `Motion graphics reference frame. ${section.visualConcept}. Style: clean, minimal, dark background (#0a0c14), white or colored text, modern flat design, no gradients, sharp edges, professional broadcast quality. NO people, NO faces.`,
            size: '1792x1024',
            quality: 'standard',
            n: 1,
          })
          return { ...section, imageUrl: imgRes.data?.[0]?.url ?? undefined }
        } catch (err) {
          return { ...section, imageError: String(err).slice(0, 100) }
        }
      })
    )

    const finalSections = withImages.map((result, i) =>
      result.status === 'fulfilled' ? result.value : { ...sections[i], imageError: 'Generation failed' }
    )

    return NextResponse.json({ sections: finalSections })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
