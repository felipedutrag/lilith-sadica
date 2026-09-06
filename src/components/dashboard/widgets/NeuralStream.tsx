"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Brain } from "lucide-react"
import { getApiUrl } from "@/lib/utils"

export function NeuralStream({ isRecordingVoice, sendTextToVoice, sessionId }: { isRecordingVoice: boolean; sendTextToVoice?: (text: string) => boolean; sessionId?: string }) {
  const [streamText, setStreamText] = useState("")
  const [streamResult, setStreamResult] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)

  // Previne Hydration Mismatch ocultando o ID dinâmico até montar no cliente
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line
    setHasMounted(true)
  }, [])

  // ... (rest of component)

  const handleStream = async () => {
    if (!streamText.trim()) return
    const text = streamText
    setStreamText("")

    // When voice is active, send text directly to the voice AI
    if (isRecordingVoice && sendTextToVoice?.(text)) {
      setStreamResult(text)
      return
    }

    setIsStreaming(true)
    setStreamResult("")
    
    try {
      const response = await fetch(getApiUrl("/api/agent/command/stream"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      })

      if (!response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim()
            if (dataStr === "[DONE]") { setIsStreaming(false); break }
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.chunk) setStreamResult(prev => prev + parsed.chunk)
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col p-6 border border-border rounded-xl bg-card relative overflow-hidden group shadow-sm h-full min-h-[260px]">
      <Brain className="text-muted/10 h-24 w-24 absolute -right-4 -bottom-4 animate-pulse" />
      
      <div className="flex justify-between items-center mb-4 z-10">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isRecordingVoice ? 'bg-red-500 animate-ping' : 'bg-muted'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              {isRecordingVoice ? 'TRANSMISSÃO DE VOZ ATIVA' : 'CANAL DE VOZ STANDBY'}
            </span>
            {hasMounted && sessionId && (
              <span className="text-[7px] font-mono text-muted-foreground/40 uppercase tracking-tighter">
                SESSÃO: {sessionId}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`text-[8px] font-mono border-border bg-muted/40 uppercase ${isRecordingVoice ? 'text-yellow-400 animate-pulse' : 'text-muted-foreground/60'}`}>
          Gemini API
        </Badge>
      </div>

      <div className="flex-1 bg-background/95 border border-border/80 rounded-lg p-4 font-mono text-[11px] leading-relaxed relative overflow-hidden flex flex-col justify-between mb-4 min-h-[120px]">
        {streamResult ? (
          <ScrollArea className="flex-1 max-h-[110px] text-muted-foreground select-text">
            <p className="whitespace-pre-wrap">{streamResult}</p>
            {isStreaming && <span className="inline-block w-1.5 h-3 bg-primary animate-pulse ml-0.5" />}
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-6 text-muted-foreground/80">
            <Activity className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-[10px] uppercase tracking-wider font-bold">Canal Neural pronto</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 z-10">
        <Input 
          value={streamText} 
          onChange={e => setStreamText(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleStream()}
          placeholder="Canal de Pensamento Direto..." 
          className="border-border/70 bg-zinc-900/80 focus-visible:ring-primary font-sans text-xs focus-visible:border-primary/40 h-8 flex-1 text-foreground placeholder:text-zinc-600"
        />
        <Button onClick={() => handleStream()} disabled={isStreaming} size="sm" className="shrink-0 bg-muted hover:bg-muted/80 text-foreground border border-border h-8 font-bold uppercase text-[9px] tracking-widest px-3">
          Stream
        </Button>
      </div>
    </div>
  )
}




