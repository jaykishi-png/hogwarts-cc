'use client'
import React from 'react'

interface Props { panelName: string; children: React.ReactNode }
interface State { hasError: boolean; error: string }

export class PanelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.panelName}] Panel error:`, error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-[#0d0f1a] rounded-xl border border-red-900/40 p-6 max-w-md w-full">
            <p className="text-sm font-semibold text-red-400 mb-1">⚠️ {this.props.panelName} crashed</p>
            <p className="text-xs text-gray-600 font-mono mb-4 break-all">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="text-xs text-purple-400 hover:text-purple-300 border border-purple-800/40 rounded px-3 py-1.5 transition-colors"
            >
              Reload panel
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
