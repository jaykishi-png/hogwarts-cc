'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Copy, Loader2, Mail, Plus, RefreshCw, Trash2, X } from 'lucide-react'

type DraftIntent = 'new-email' | 'reply' | 'follow-up'
type DraftTone = 'professional' | 'warm' | 'confident' | 'friendly-firm'
type DraftLength = 'short' | 'medium' | 'detailed'

interface EmailDraftResult {
  subject: string
  greeting: string
  body: string
  closing: string
  signature: string
  fullEmail: string
  notes: string[]
}

interface EmailTemplate {
  id: string
  title: string
  intent: DraftIntent
  tone: DraftTone
  length: DraftLength
  recipient: string
  goal: string
  context: string
  keyPoints: string
  cta: string
  signature: string
  createdAt: string
  useCount: number
}

const STORAGE_KEY = 'hw-email-templates'

const SEED_TEMPLATES: EmailTemplate[] = [
  {
    id: 'email-template-1',
    title: 'Client Follow-Up',
    intent: 'follow-up',
    tone: 'professional',
    length: 'short',
    recipient: 'Client',
    goal: 'Follow up on an outstanding decision and keep momentum moving.',
    context: 'We previously sent over the proposal and timeline. I want to sound proactive, clear, and easy to respond to.',
    keyPoints: 'Acknowledge their time, restate the main decision, keep it brief.',
    cta: 'Let me know by Friday if you want to move forward.',
    signature: 'Jay',
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
  {
    id: 'email-template-2',
    title: 'Warm Intro Reply',
    intent: 'reply',
    tone: 'warm',
    length: 'medium',
    recipient: 'New contact',
    goal: 'Reply to an introduction and move toward a call.',
    context: 'I want to sound thoughtful and professional while keeping the reply lightweight.',
    keyPoints: 'Thank them for the intro, mention relevance, propose next step.',
    cta: 'Happy to coordinate a quick call next week.',
    signature: 'Jay',
    createdAt: new Date().toISOString(),
    useCount: 0,
  },
]

const INTENT_LABELS: Record<DraftIntent, string> = {
  'new-email': 'New email',
  reply: 'Reply',
  'follow-up': 'Follow-up',
}

const TONE_STYLES: Record<DraftTone, string> = {
  professional: 'border-blue-800/30 bg-blue-900/20 text-blue-300',
  warm: 'border-amber-800/30 bg-amber-900/20 text-amber-300',
  confident: 'border-emerald-800/30 bg-emerald-900/20 text-emerald-300',
  'friendly-firm': 'border-rose-800/30 bg-rose-900/20 text-rose-300',
}

function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return SEED_TEMPLATES
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TEMPLATES))
      return SEED_TEMPLATES
    }
    return JSON.parse(raw) as EmailTemplate[]
  } catch {
    return SEED_TEMPLATES
  }
}

function persistTemplates(templates: EmailTemplate[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)) } catch {}
}

export function EmailDraftPanel({ pushLog }: { pushLog: (msg: string, type: 'chat' | 'status' | 'move' | 'meeting') => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateTitle, setTemplateTitle] = useState('')
  const [intent, setIntent] = useState<DraftIntent>('new-email')
  const [tone, setTone] = useState<DraftTone>('professional')
  const [length, setLength] = useState<DraftLength>('medium')
  const [recipient, setRecipient] = useState('')
  const [goal, setGoal] = useState('')
  const [context, setContext] = useState('')
  const [keyPoints, setKeyPoints] = useState('')
  const [cta, setCta] = useState('')
  const [signature, setSignature] = useState('Jay')
  const [draft, setDraft] = useState<EmailDraftResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  function copyValue(label: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(label)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  async function generate() {
    if (!goal.trim() || !context.trim() || loading) return

    setLoading(true)
    setError('')
    setDraft(null)
    pushLog(`Drafting a ${INTENT_LABELS[intent].toLowerCase()} in a ${tone} tone…`, 'status')

    try {
      const res = await fetch('/api/agents/email-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          tone,
          length,
          recipient: recipient || undefined,
          goal,
          context,
          keyPoints: keyPoints || undefined,
          cta: cta || undefined,
          signature: signature || undefined,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }

      setDraft(data.draft ?? null)
      pushLog(`Generated a professional email draft for ${recipient || 'your recipient'}.`, 'chat')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  function applyTemplate(template: EmailTemplate) {
    setIntent(template.intent)
    setTone(template.tone)
    setLength(template.length)
    setRecipient(template.recipient)
    setGoal(template.goal)
    setContext(template.context)
    setKeyPoints(template.keyPoints)
    setCta(template.cta)
    setSignature(template.signature)
    const updated = templates.map(item => (
      item.id === template.id ? { ...item, useCount: item.useCount + 1 } : item
    ))
    setTemplates(updated)
    persistTemplates(updated)
    pushLog(`Loaded email template: ${template.title}.`, 'status')
  }

  function saveTemplate() {
    if (!templateTitle.trim() || !goal.trim() || !context.trim()) return
    const entry: EmailTemplate = {
      id: `email-template-${Date.now()}`,
      title: templateTitle.trim(),
      intent,
      tone,
      length,
      recipient: recipient.trim(),
      goal: goal.trim(),
      context: context.trim(),
      keyPoints: keyPoints.trim(),
      cta: cta.trim(),
      signature: signature.trim(),
      createdAt: new Date().toISOString(),
      useCount: 0,
    }
    const updated = [entry, ...templates]
    setTemplates(updated)
    persistTemplates(updated)
    setTemplateTitle('')
    setShowSaveTemplate(false)
    pushLog(`Saved email template: ${entry.title}.`, 'chat')
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter(template => template.id !== id)
    setTemplates(updated)
    persistTemplates(updated)
  }

  const sortedTemplates = [...templates].sort((a, b) => b.useCount - a.useCount)

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">
      <div className="flex-shrink-0">
        <p className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Email Drafter</p>
        <p className="text-[11px] text-gray-600">Turn rough context into polished professional emails</p>
      </div>

      <div className="flex-shrink-0 space-y-3">
        <div className="rounded-xl border border-[#1e2030] bg-[#0d0f1a] p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Templates</p>
              <p className="text-[11px] text-gray-600">Save reusable email setups and load them instantly</p>
            </div>
            <button
              onClick={() => setShowSaveTemplate(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e2030] bg-[#0a0c14] hover:bg-[#111321] text-gray-400 hover:text-gray-200 transition-colors"
              title="Save template"
            >
              {showSaveTemplate ? <X size={13} /> : <Plus size={13} />}
            </button>
          </div>

          {showSaveTemplate && (
            <div className="space-y-2">
              <input
                type="text"
                value={templateTitle}
                onChange={e => setTemplateTitle(e.target.value)}
                placeholder="Template name"
                className="w-full bg-[#07080e] border border-[#1e2030] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveTemplate}
                  disabled={!templateTitle.trim() || !goal.trim() || !context.trim()}
                  className="flex-1 py-2 rounded-lg bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                >
                  Save current setup
                </button>
                <button
                  onClick={() => { setShowSaveTemplate(false); setTemplateTitle('') }}
                  className="flex-1 py-2 rounded-lg border border-[#1e2030] bg-[#07080e] hover:bg-[#0d0f1a] text-gray-400 text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
            {sortedTemplates.map(template => (
              <div key={template.id} className="rounded-lg border border-[#1e2030] bg-[#0a0c14] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => applyTemplate(template)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[11px] font-medium text-gray-200">{template.title}</p>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TONE_STYLES[template.tone]}`}>{template.tone}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{template.goal}</p>
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['new-email', 'reply', 'follow-up'] as DraftIntent[]).map(option => (
            <button
              key={option}
              onClick={() => setIntent(option)}
              className={`rounded-xl border px-3 py-2 text-[11px] font-medium transition-colors ${
                intent === option
                  ? 'border-purple-700/50 bg-purple-900/20 text-purple-300'
                  : 'border-[#1e2030] bg-[#0d0f1a] text-gray-600 hover:text-gray-400'
              }`}
            >
              {INTENT_LABELS[option]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value as DraftTone)}
              className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-700/60"
            >
              <option value="professional">Professional</option>
              <option value="warm">Warm</option>
              <option value="confident">Confident</option>
              <option value="friendly-firm">Friendly but firm</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Length</label>
            <select
              value={length}
              onChange={e => setLength(e.target.value as DraftLength)}
              className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-700/60"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Recipient or audience</label>
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="e.g. Client, vendor, hiring manager, internal team"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Goal</label>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            rows={2}
            placeholder="What do you need this email to accomplish?"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Context</label>
          <textarea
            value={context}
            onChange={e => setContext(e.target.value)}
            rows={4}
            placeholder="Paste notes, background, constraints, conversation history, or anything the draft should account for…"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Must-cover points (optional)</label>
          <textarea
            value={keyPoints}
            onChange={e => setKeyPoints(e.target.value)}
            rows={3}
            placeholder="Bullet points, objections to address, dates, deliverables, pricing, next steps…"
            className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Call to action (optional)</label>
            <input
              type="text"
              value={cta}
              onChange={e => setCta(e.target.value)}
              placeholder="e.g. confirm by Friday"
              className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 block">Signature</label>
            <input
              type="text"
              value={signature}
              onChange={e => setSignature(e.target.value)}
              placeholder="Jay"
              className="w-full bg-[#0d0f1a] border border-[#1e2030] rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-purple-700/60 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!goal.trim() || !context.trim() || loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-800/80 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
        >
          {loading ? <><Loader2 size={15} className="animate-spin" /> Drafting…</> : <><Mail size={15} /> Generate Email Draft</>}
        </button>
      </div>

      {error && (
        <div className="flex-shrink-0 flex items-start gap-2 rounded-xl border border-red-800/40 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {draft && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Draft Ready</p>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TONE_STYLES[tone]}`}>{tone}</span>
            </div>
            <button onClick={generate} className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              <RefreshCw size={10} /> Regenerate
            </button>
          </div>

          <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Subject</p>
              <button
                onClick={() => copyValue('subject', draft.subject)}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
              >
                {copied === 'subject' ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />} Copy
              </button>
            </div>
            <p className="text-sm font-semibold text-gray-100">{draft.subject}</p>
          </div>

          <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Email Body</p>
              <button
                onClick={() => copyValue('full', draft.fullEmail)}
                className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-300 transition-colors"
              >
                {copied === 'full' ? <CheckCircle2 size={10} className="text-emerald-400" /> : <Copy size={10} />} Copy full draft
              </button>
            </div>
            <div className="rounded-lg border border-[#1a1c2e] bg-[#0a0c14] px-4 py-3 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-300">
              {draft.fullEmail}
            </div>
          </div>

          {draft.notes?.length > 0 && (
            <div className="bg-[#0d0f1a] rounded-xl border border-[#1e2030] p-3 space-y-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Draft Notes</p>
              <div className="space-y-1">
                {draft.notes.map((note, idx) => (
                  <p key={idx} className="text-[11px] text-gray-500 leading-relaxed">{note}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !draft && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <Mail size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Add your context to draft a polished email</p>
            <p className="text-[11px] text-gray-700 mt-1">Useful for outreach, replies, follow-ups, and internal communication</p>
          </div>
        </div>
      )}
    </div>
  )
}
