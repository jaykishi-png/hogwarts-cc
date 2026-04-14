// ─── Voice Input — Web Speech API wrapper ────────────────────────────────────
//
// Browser-only module. Calling start() in a server environment is safe — it
// will trigger the onError callback with a "not supported" message.

export interface VoiceInputOptions {
  onResult:   (transcript: string) => void
  onEnd:      () => void
  onError:    (error: string) => void
  continuous?: boolean
  language?:   string
}

// ─── Web Speech API typings (not universally in @types/lib.dom) ───────────────

interface SpeechRecognitionResultItem {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResult {
  readonly length: number
  item(index: number): SpeechRecognitionResultItem
  [index: number]: SpeechRecognitionResultItem
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEventInit {
  results?: SpeechRecognitionResultList
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface ISpeechRecognition extends EventTarget {
  continuous:      boolean
  interimResults:  boolean
  lang:            string
  onresult:  ((event: SpeechRecognitionEvent)      => void) | null
  onend:     (() => void) | null
  onerror:   ((event: SpeechRecognitionErrorEvent) => void) | null
  start(): void
  stop():  void
  abort(): void
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition
}

// Augment window type for cross-browser compatibility
declare global {
  interface Window {
    SpeechRecognition?:       ISpeechRecognitionConstructor
    webkitSpeechRecognition?: ISpeechRecognitionConstructor
  }
}

export class VoiceInput {
  private recognition: ISpeechRecognition | null = null
  private isListening = false

  constructor(private options: VoiceInputOptions) {}

  // ─── Static guard ─────────────────────────────────────────────────────────

  static isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return !!(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  start(): void {
    if (!VoiceInput.isSupported()) {
      this.options.onError('Speech recognition is not supported in this browser.')
      return
    }

    if (this.isListening) return

    const SpeechRecognitionImpl =
      window.SpeechRecognition ?? window.webkitSpeechRecognition

    if (!SpeechRecognitionImpl) {
      this.options.onError('Speech recognition is not supported in this browser.')
      return
    }

    try {
      this.recognition = new SpeechRecognitionImpl()
    } catch {
      this.options.onError('Failed to initialise speech recognition.')
      return
    }

    this.recognition.continuous     = this.options.continuous ?? false
    this.recognition.interimResults = false
    this.recognition.lang           = this.options.language ?? 'en-US'

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      if (transcript) {
        this.options.onResult(transcript)
      }
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.options.onEnd()
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false
      const msg = event.error ?? 'Unknown speech recognition error'
      this.options.onError(String(msg))
    }

    try {
      this.recognition.start()
      this.isListening = true
    } catch (err: unknown) {
      this.isListening = false
      const message = err instanceof Error ? err.message : 'Failed to start speech recognition'
      this.options.onError(message)
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return
    try {
      this.recognition.stop()
    } catch {
      // ignore errors on stop
    }
    this.isListening = false
  }

  toggle(): void {
    if (this.isListening) {
      this.stop()
    } else {
      this.start()
    }
  }

  get listening(): boolean {
    return this.isListening
  }
}
