'use client'

const SECTIONS: {
  header: string
  actions: { label: string; prompt: string }[]
}[] = [
  {
    header: 'MORNING',
    actions: [
      { label: '📋 Daily Brief',   prompt: '/brief' },
      { label: "📊 What's overdue?", prompt: '@HERMIONE What items are overdue or blocked right now?' },
      { label: '📬 Catch me up',   prompt: '@DUMBLEDORE Summarise my Gmail, Slack and calendar from the last 24 hours and tell me what needs my attention' },
    ],
  },
  {
    header: 'PRODUCTION',
    actions: [
      { label: '🎬 QC Checklist',   prompt: '@MOODY Give me a pre-publish QC checklist for a YouTube ad' },
      { label: '📝 Status Update',  prompt: '@HERMIONE Give me a full production status update across all active projects' },
      { label: '⚠️ Flag Blockers',  prompt: '@HERMIONE List every blocked or at-risk item right now' },
    ],
  },
  {
    header: 'CREATIVE',
    actions: [
      { label: '🎣 10 Hooks (RR)', prompt: '@FRED Generate 10 high-converting YouTube hooks for Revenue Rush. Mix formats: curiosity gap, controversy, specificity, relatability.' },
      { label: '🎣 10 Hooks (TP)', prompt: '@FRED Generate 10 scroll-stopping hooks for The Process supplement brand.' },
      { label: '💡 Campaign Idea', prompt: '@RON Generate a complete campaign concept for Revenue Rush including hook angles, content formats, and a brief.' },
      { label: '🏷️ Name This',     prompt: '@FLEUR Generate 10 product name options. I\'ll give you the brief next.' },
    ],
  },
  {
    header: 'TEAM',
    actions: [
      { label: '👥 1:1 Prep',    prompt: '@HAGRID Help me prep for a 1:1 with a team member. I\'ll tell you who.' },
      { label: '📋 Write SOP',   prompt: '@McGONAGALL I need to document a process as an SOP. I\'ll describe the process next.' },
      { label: '🔮 Trend Check', prompt: '@TRELAWNEY What are the biggest content and algorithm trends I should be acting on right now for Revenue Rush and The Process?' },
    ],
  },
]

export function QuickActionsPanel({ onAction }: { onAction: (prompt: string) => void }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 mb-3">
        <p className="text-sm font-semibold text-gray-200">⚡ Quick Actions</p>
        <p className="text-[11px] text-gray-600 mt-0.5">One click to run</p>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5
        [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-[#2a2d3a] [&::-webkit-scrollbar-thumb]:rounded-full">
        {SECTIONS.map((section) => (
          <div key={section.header}>
            <p className="text-[9px] font-semibold text-gray-700 uppercase tracking-wider mb-1.5 mt-3 first:mt-0">
              {section.header}
            </p>
            <div className="space-y-1">
              {section.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => onAction(action.prompt)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-[#1e2030] bg-[#0a0c14] hover:bg-[#0d0f1a] hover:border-[#2a2d3a] transition-all text-sm text-gray-300 flex items-center gap-2"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
