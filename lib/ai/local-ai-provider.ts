// Client-side local AI provider abstraction.
// Runs in the browser, connects directly to user's local Ollama instance.
// Future providers: Chrome Prompt API, AI Edge Gallery, WebGPU inference.

export interface LocalAIProvider {
  name: string
  detect(): Promise<boolean>
  chat(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    model: string,
    onToken: (token: string) => void,
    options?: { num_predict?: number; think?: boolean },
    signal?: AbortSignal
  ): Promise<void>
}

// Strips Gemma 4 <think>...</think> blocks from streaming output.
// Mirrors ThinkingBlockFilter from route-runtime-utils.ts (server-side).
class ThinkingBlockFilter {
  private inThinkBlock = false
  private buffer = ''

  process(token: string): string {
    this.buffer += token
    let output = ''

    while (this.buffer.length > 0) {
      if (this.inThinkBlock) {
        const closeIdx = this.buffer.indexOf('</think>')
        if (closeIdx === -1) {
          // Still inside think block, consume everything
          this.buffer = ''
          break
        }
        // Skip everything including the close tag
        this.buffer = this.buffer.slice(closeIdx + 8)
        this.inThinkBlock = false
      } else {
        const openIdx = this.buffer.indexOf('<think>')
        if (openIdx === -1) {
          // No think tag, check for partial match at end
          const partialCheck = '<think>'
          let partialLen = 0
          for (
            let i = Math.max(0, this.buffer.length - partialCheck.length);
            i < this.buffer.length;
            i++
          ) {
            const remaining = this.buffer.slice(i)
            if (partialCheck.startsWith(remaining)) {
              partialLen = remaining.length
              break
            }
          }
          output += this.buffer.slice(0, this.buffer.length - partialLen)
          this.buffer = this.buffer.slice(this.buffer.length - partialLen)
          break
        }
        output += this.buffer.slice(0, openIdx)
        this.buffer = this.buffer.slice(openIdx + 7)
        this.inThinkBlock = true
      }
    }

    return output
  }

  flush(): string {
    const remaining = this.buffer
    this.buffer = ''
    this.inThinkBlock = false
    return remaining
  }
}

export class OllamaLocalProvider implements LocalAIProvider {
  name = 'ollama'

  constructor(private url: string) {}

  async detect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async chat(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    model: string,
    onToken: (token: string) => void,
    options?: { num_predict?: number; think?: boolean },
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
        options: options?.num_predict ? { num_predict: options.num_predict } : undefined,
        think: options?.think ?? false,
        keep_alive: '30m',
      }),
      signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Ollama error ${res.status}: ${text.slice(0, 200)}`)
    }

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    const thinkFilter = new ThinkingBlockFilter()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            const content = json.message?.content
            if (content) {
              const filtered = thinkFilter.process(content)
              if (filtered) onToken(filtered)
            }
          } catch {
            // Partial JSON line, skip
          }
        }
      }

      // Flush remaining content
      const flushed = thinkFilter.flush()
      if (flushed) onToken(flushed)
    } finally {
      reader.releaseLock()
    }
  }
}

// Future: Chrome Prompt API provider
// Uncomment and implement when window.ai.languageModel ships on mobile
//
// export class ChromeAIProvider implements LocalAIProvider {
//   name = 'chrome-ai'
//   async detect() {
//     return typeof window !== 'undefined'
//       && 'ai' in window
//       && 'languageModel' in (window as any).ai
//   }
//   async chat(systemPrompt, messages, _model, onToken, _options, signal) {
//     const ai = (window as any).ai.languageModel
//     const session = await ai.create({ systemPrompt })
//     const fullInput = messages.map(m => `${m.role}: ${m.content}`).join('\n')
//     const stream = session.promptStreaming(fullInput)
//     const reader = stream.getReader()
//     while (true) {
//       const { done, value } = await reader.read()
//       if (done) break
//       onToken(value)
//     }
//     session.destroy()
//   }
// }
