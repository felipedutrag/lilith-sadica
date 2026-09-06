"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Terminal, Activity, Zap } from "lucide-react"
import { executeCommand } from "@/actions/agent"

export function CommandCenter() {
  const [commandText, setCommandText] = useState("")
  const [commandResult, setCommandResult] = useState<string | null>(null)
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)

  const handleCommand = async (presetText?: string) => {
    const txt = presetText || commandText
    if (!txt.trim()) return
    
    setIsExecutingCommand(true)
    setCommandResult(null)
    try {
      const data = await executeCommand(txt)
      if (data.status === 'success') {
        setCommandResult(data.text)
        if (!presetText) setCommandText("")
      } else {
        setCommandResult("Erro ao executar: " + data.error)
      }
    } catch (err: any) {
      setCommandResult("Erro de conexão: " + err.message)
    }
    setIsExecutingCommand(false)
  }

  return (
    <div className="relative group">
      <Card className="relative h-full border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-sans font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
            <Terminal size={14} /> Comando Central
          </CardTitle>
          <p className="text-xs text-muted-foreground font-sans">O que você deseja que eu execute agora, Cadelo?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={commandText} 
              onChange={e => setCommandText(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleCommand()}
              placeholder="Digite sua ordem brutal aqui..." 
              className="border-border bg-background focus-visible:ring-primary focus-visible:ring-offset-0 font-mono text-xs focus-visible:border-primary/40 text-foreground" 
            />
            <Button 
              onClick={() => handleCommand()} 
              disabled={isExecutingCommand}
              size="icon" 
              className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              {isExecutingCommand ? <Activity className="animate-spin" size={18} /> : <Zap size={18} />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => handleCommand("Qual meu saldo na okx?")} variant="outline" size="sm" className="border-border text-[10px] font-bold uppercase tracking-wider hover:bg-muted hover:text-foreground font-sans">Ver Saldo</Button>
            <Button onClick={() => handleCommand("Quais as posições abertas?")} variant="outline" size="sm" className="border-border text-[10px] font-bold uppercase tracking-wider hover:bg-muted hover:text-foreground font-sans">Ver Posições</Button>
            <Button onClick={() => handleCommand("Qual o preço do BTC?")} variant="outline" size="sm" className="border-border text-[10px] font-bold uppercase tracking-wider hover:bg-muted hover:text-foreground font-sans">Preço BTC</Button>
          </div>
          {commandResult && (
            <div className="mt-4 p-3 bg-muted/40 border border-border rounded-md animate-in fade-in-50">
              <p className="text-xs font-mono text-foreground whitespace-pre-wrap">{commandResult}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}




