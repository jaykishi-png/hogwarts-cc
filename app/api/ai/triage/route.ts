import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/db/client'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-your')) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  // Fetch active tasks
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, source, tags, due_date, priority_score')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!tasks?.length) return NextResponse.json({ updated: 0 })

  const today = new Date().toISOString().split('T')[0]

  const prompt = `You are a task prioritization assistant for Jay, a Content Manager at a video production company.

Today is ${today}. Jay manages video lesson content across Monday.com boards, email, and Slack.

Here are Jay's current active tasks:
${tasks.map((t, i) => `${i + 1}. [${t.source}] "${t.title}"${t.due_date ? ` (due: ${t.due_date})` : ''}${t.tags?.length ? ` [tags: ${t.tags.join(', ')}]` : ''}`).join('\n')}

Score each task from 1-100 based on:
- Urgency (due date proximity, "needs review" items block other people)
- Impact (blocking others = higher score)
- Source weight (Monday Needs Review > Slack DMs > Gmail > Calendar)

Return ONLY a JSON array like this (no explanation):
[{"id": "task-id", "score": 85, "reason": "one line why"}, ...]

Use the exact task IDs provided.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'No JSON in response' }, { status: 500 })

    const scores: Array<{ id: string; score: number; reason: string }> = JSON.parse(jsonMatch[0])

    // Update priority scores in DB (only if not user-edited)
    let updated = 0
    for (const { id, score, reason } of scores) {
      const task = tasks.find(t => t.id === id)
      if (!task) continue

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          priority_score: score,
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_edited', false) // don't overwrite user changes

      if (!updateError) updated++
    }

    // Store top 3 priorities
    const top3 = scores.sort((a, b) => b.score - a.score).slice(0, 3)
    await supabase.from('config').upsert({
      key: 'ai_top_priorities',
      value: JSON.stringify(top3),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ updated, top3 })
  } catch (err) {
    console.error('AI triage error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
