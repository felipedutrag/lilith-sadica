"use client"

import { useState, useRef, useEffect } from "react"
import { useDualVoice } from "@/hooks/useDualVoice"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Users, Mic, Volume2, Sparkles, MessageSquare, Radio, Send } from "lucide-react"

const availableVoices = [
  { value: "Zephyr", label: "Zephyr (Brilhante / Enérgica)" },
  { value: "Puck", label: "Puck (Otimista / Upbeat)" },
  { value: "Charon", label: "Charon (Informativa / Confiável)" },
  { value: "Aoede", label: "Aoede (Descontraída / Inteligente)" },
  { value: "Kore", label: "Kore (Firme / Confiante)" },
  { value: "Fenrir", label: "Fenrir (Animada / Entusiasta)" },
  { value: "Despina", label: "Despina (Suave / Calorosa)" },
  { value: "Leda", label: "Leda (Jovem / Composta)" },
  { value: "Vindemiatrix", label: "Vindemiatrix (Gentil / Madura)" },
  { value: "Achird", label: "Achird (Amigável / Inquisitiva)" },
  { value: "Sadachbia", label: "Sadachbia (Viva / Descontraída)" },
  { value: "Zubenelgenubi", label: "Zubenelgenubi (Casual / Resonante)" }
]

export default function DualVoiceDashboard() {
  const [voiceA, setVoiceA] = useState("Aoede")
  const [voiceB, setVoiceB] = useState("Zubenelgenubi")
  const [customNameA, setCustomNameA] = useState("")
  const [customPromptA, setCustomPromptA] = useState("")
  const [customNameB, setCustomNameB] = useState("")
  const [customPromptB, setCustomPromptB] = useState("Você é um homem extremamente másculo, confiante, com presença de macho alfa dominante. Suas falas devem ser firmes, diretas, curtas e expressar total autoridade e segurança.")
  const [inputText, setInputText] = useState("")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    isRecordingVoice,
    agentA,
    agentB,
    chatLogs,
    sendTextToGroup,
    toggleVoiceRecording
  } = useDualVoice()

  // Scroll automático para as últimas falas
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollArea = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [chatLogs, agentA.transcript, agentB.transcript])

  const handleSendText = () => {
    if (!inputText.trim()) return
    sendTextToGroup(inputText.trim())
    setInputText("")
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Users size={18} className="text-primary" /> Sala Coletiva • Multilaterabilidade de Voz
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-sans">
            Inicie um canal de áudio com duas IAs simultâneas. Elas debaterão entre si e colaborarão com você em tempo real.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Controle e Configuração */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-border bg-card p-6 space-y-6">
            <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Radio size={14} className="text-primary" /> Painel de Transmissão
            </h3>
            <Separator className="bg-border" />
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              
              {/* VOZ A */}
              <div className="space-y-3 p-3 border border-border/50 rounded-lg bg-zinc-950/30">
                <div className="flex gap-3">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Voz A (Áudio)</Label>
                    <Select value={voiceA} onValueChange={setVoiceA} disabled={isRecordingVoice}>
                      <SelectTrigger className="w-full text-xs font-mono border-border bg-background">
                        <SelectValue placeholder="Selecione a voz..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {availableVoices.map(voice => (
                          <SelectItem key={voice.value} value={voice.value}>
                            {voice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Nome A</Label>
                    <Input value={customNameA} onChange={e => setCustomNameA(e.target.value)} placeholder="Ex: Lilith" disabled={isRecordingVoice} className="h-9 text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Prompt de Personalidade A</Label>
                  <Textarea value={customPromptA} onChange={e => setCustomPromptA(e.target.value)} placeholder="Defina como ela deve agir..." disabled={isRecordingVoice} className="text-xs font-mono min-h-[60px] resize-y" />
                </div>
              </div>

              {/* VOZ B */}
              <div className="space-y-3 p-3 border border-border/50 rounded-lg bg-zinc-950/30">
                <div className="flex gap-3">
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Voz B (Áudio)</Label>
                    <Select value={voiceB} onValueChange={setVoiceB} disabled={isRecordingVoice}>
                      <SelectTrigger className="w-full text-xs font-mono border-border bg-background">
                        <SelectValue placeholder="Selecione a voz..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[220px]">
                        {availableVoices.map(voice => (
                          <SelectItem key={voice.value} value={voice.value}>
                            {voice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Nome B</Label>
                    <Input value={customNameB} onChange={e => setCustomNameB(e.target.value)} placeholder="Ex: Zephyr" disabled={isRecordingVoice} className="h-9 text-xs font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-foreground uppercase tracking-wider">Prompt de Personalidade B</Label>
                  <Textarea value={customPromptB} onChange={e => setCustomPromptB(e.target.value)} placeholder="Defina como ele deve agir..." disabled={isRecordingVoice} className="text-xs font-mono min-h-[60px] resize-y" />
                </div>
              </div>

            </div>

            <Separator className="bg-border" />

            <Button
              onClick={() => toggleVoiceRecording(voiceA, voiceB, customNameA, customPromptA, customNameB, customPromptB)}
              className={`w-full font-bold uppercase tracking-widest text-xs h-12 transition-all duration-300 ${
                isRecordingVoice
                  ? "bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              {isRecordingVoice ? "Desconectar Canal Coletivo" : "Iniciar Chamada Coletiva"}
            </Button>
          </Card>

          {/* Visualizadores das IAs */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* IA A */}
            <Card className={`border p-4 flex flex-col items-center justify-center space-y-3 transition-all duration-300 ${
              agentA.isSpeaking ? "border-primary/80 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]" : "border-border bg-card"
            }`}>
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  agentA.isSpeaking ? "bg-primary text-primary-foreground scale-105" : "bg-muted text-muted-foreground"
                }`}>
                  A
                </div>
                {agentA.isSpeaking && (
                  <span className="absolute -inset-1 rounded-full border border-primary animate-ping opacity-60 pointer-events-none" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold font-mono text-zinc-300 uppercase tracking-wider">{agentA.name}</p>
                <p className="text-[8px] font-mono text-muted-foreground uppercase">{agentA.voiceName}</p>
              </div>
              <Badge variant="outline" className={`text-[7px] font-mono border-border uppercase ${
                agentA.isSpeaking ? "text-primary border-primary/40 bg-primary/10 animate-pulse" : "text-muted-foreground/60"
              }`}>
                {agentA.isSpeaking ? "Falando..." : "Silêncio"}
              </Badge>
            </Card>

            {/* IA B */}
            <Card className={`border p-4 flex flex-col items-center justify-center space-y-3 transition-all duration-300 ${
              agentB.isSpeaking ? "border-amber-500/80 bg-amber-950/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "border-border bg-card"
            }`}>
              <div className="relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  agentB.isSpeaking ? "bg-amber-500 text-black scale-105" : "bg-muted text-muted-foreground"
                }`}>
                  B
                </div>
                {agentB.isSpeaking && (
                  <span className="absolute -inset-1 rounded-full border border-amber-500 animate-ping opacity-60 pointer-events-none" />
                )}
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold font-mono text-zinc-300 uppercase tracking-wider">{agentB.name}</p>
                <p className="text-[8px] font-mono text-muted-foreground uppercase">{agentB.voiceName}</p>
              </div>
              <Badge variant="outline" className={`text-[7px] font-mono border-border uppercase ${
                agentB.isSpeaking ? "text-amber-500 border-amber-500/40 bg-amber-500/10 animate-pulse" : "text-muted-foreground/60"
              }`}>
                {agentB.isSpeaking ? "Falando..." : "Silêncio"}
              </Badge>
            </Card>

          </div>
        </div>

        {/* Histórico e Logs em Tempo Real */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card flex flex-col h-[520px]">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-xs font-mono uppercase tracking-widest text-zinc-300 flex items-center gap-2">
                <MessageSquare size={14} className="text-primary" /> Linha do Tempo Auditiva
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden p-0 relative flex flex-col justify-between">
              
              {isRecordingVoice ? (
                <>
                  {/* Container de Rolagem do Chat */}
                  <ScrollArea ref={scrollContainerRef} className="flex-1 p-6 text-zinc-200">
                    <div className="space-y-4 pb-4">
                      
                      {chatLogs.map((log, index) => {
                        const isA = log.role === "Lilith";
                        const isUser = log.role === "Você";
                        return (
                          <div
                            key={index}
                            className={`flex flex-col space-y-1.5 p-3 rounded-lg border transition-all ${
                              isUser
                                ? "bg-zinc-900 border-zinc-800 ml-12 text-left"
                                : isA
                                ? "bg-red-950/15 border-red-500/20 mr-12 text-left"
                                : "bg-amber-950/15 border-amber-500/20 mr-12 text-left"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-mono uppercase tracking-wider font-bold ${
                                isUser ? "text-emerald-400" : isA ? "text-red-400" : "text-amber-400"
                              }`}>
                                {log.role}
                              </span>
                              <span className="text-[7px] font-mono text-muted-foreground/50">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap select-text">
                              {log.text}
                            </p>
                          </div>
                        );
                      })}

                      {/* Mostrar o chunk ativo em andamento */}
                      {agentA.transcript && agentA.isSpeaking && (
                        <div className="flex flex-col space-y-1.5 p-3 rounded-lg border bg-red-950/5 border-red-500/10 mr-12 text-left animate-pulse">
                          <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-red-400">
                            {agentA.name} (Transmitindo)
                          </span>
                          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                            {agentA.transcript}...
                          </p>
                        </div>
                      )}

                      {agentB.transcript && agentB.isSpeaking && (
                        <div className="flex flex-col space-y-1.5 p-3 rounded-lg border bg-amber-950/5 border-amber-500/10 mr-12 text-left animate-pulse">
                          <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-amber-400">
                            {agentB.name} (Transmitindo)
                          </span>
                          <p className="text-xs font-mono text-zinc-400 leading-relaxed">
                            {agentB.transcript}...
                          </p>
                        </div>
                      )}

                    </div>
                  </ScrollArea>

                  {/* Input de Envio de Texto Manual */}
                  <div className="p-4 border-t border-border/50 bg-zinc-950/40 flex gap-2 items-center">
                    <Input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendText()}
                      placeholder="Envie uma mensagem de texto para o grupo..."
                      className="border-border/70 bg-zinc-900/80 focus-visible:ring-primary font-sans text-xs focus-visible:border-primary/40 h-10 flex-1 text-foreground placeholder:text-zinc-600"
                    />
                    <Button
                      onClick={handleSendText}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-10 p-0 flex items-center justify-center rounded-lg shrink-0"
                    >
                      <Send size={16} />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/80">
                  <Volume2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
                  <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">Canal de Voz Coletivo Standby</p>
                  <p className="text-[9px] font-sans text-muted-foreground mt-2 max-w-sm">
                    Selecione as vozes de cada IA no painel ao lado e clique em **Iniciar Chamada Coletiva** para começar.
                  </p>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
