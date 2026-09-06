"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Terminal, 
  Activity, 
  Shield, 
  Cpu, 
  Database, 
  RefreshCw, 
  MessageSquare, 
  Users, 
  Zap, 
  Server,
  Lock,
  Globe
} from "lucide-react"

interface BotStats {
  status: string;
  chats: any[];
  activeChatsCount: number;
  leadsCount: number;
}

export default function SystemDashboard() {
  const [logs, setLogs] = useState<string[]>([])
  const [stats, setStats] = useState<BotStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSync, setLastSync] = useState<string>("")
  const [cpuUsage, setCpuUsage] = useState(0)
  const [memUsage, setMemoryUsage] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const isRelevantLog = (line: string) => {
    const lower = line.toLowerCase()
    return (
      /erro|error|fail|exception|crash|falha|FATAL/i.test(lower) ||
      /voice|voz|gemini|IA|lilith|speech|audio|transcri/i.test(lower)
    )
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs")
      const data = await res.json()
      if (data.status === "success") {
        setLogs(data.logs.filter(isRelevantLog))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/bot-stats")
      const data = await res.json()
      if (data.status === "success") {
        setStats(data)
        setLastSync(new Date().toLocaleTimeString('pt-BR'))
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line
    fetchLogs()
    fetchStats()
    const interval = setInterval(fetchLogs, 5000)
    
    // Simulate real-time metrics for aesthetic
    const metricsInterval = setInterval(() => {
      setCpuUsage(Math.floor(Math.random() * 15) + 5)
      setMemoryUsage(Math.floor(Math.random() * 10) + 40)
    }, 3000)

    return () => {
      clearInterval(interval)
      clearInterval(metricsInterval)
    }
  }, [])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-sm group hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">Conversas Ativas</p>
              <p className="text-2xl font-black text-foreground font-mono">{stats?.activeChatsCount || 0}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary/40 group-hover:text-primary/60 transition-colors" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm group hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">Leads Coletados</p>
              <p className="text-2xl font-black text-foreground font-mono">{stats?.leadsCount || 0}</p>
            </div>
            <Users className="h-8 w-8 text-primary/40 group-hover:text-primary/60 transition-colors" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm group hover:border-green-500/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">Módulo IA</p>
              <Badge variant="outline" className="mt-1 border-green-500/50 text-green-500 bg-green-500/5 font-mono">GEMINI-3.1-FLASH</Badge>
            </div>
            <Cpu className="h-8 w-8 text-green-500/40 group-hover:text-green-500/60 transition-colors" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm group hover:border-primary/40 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-sans">Status Proteção</p>
              <Badge variant="outline" className="mt-1 border-primary/50 text-primary bg-primary/5 font-mono">CRÍTICO / ATIVO</Badge>
            </div>
            <Shield className="h-8 w-8 text-primary/40 group-hover:text-primary/60 transition-colors" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Terminal Logs */}
        <Card className="lg:col-span-2 border-zinc-900 bg-black shadow-xl flex flex-col h-[600px] relative overflow-hidden">
          <CardHeader className="pb-2 border-b border-zinc-900 bg-black z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                   <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <CardTitle className="text-xs uppercase tracking-widest text-primary font-mono flex items-center gap-2">
                  <Terminal className="h-4 w-4" /> Nucleus Shell v2.4
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-500/60 font-mono">LIVE_FEED</span>
                 </div>
                 <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500 font-mono">LILITH-OS.EXE</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 bg-black z-10">
            <ScrollArea className="h-full w-full p-4">
              <div className="space-y-1 font-mono text-xs text-green-500/70">
                <p className="text-muted-foreground mb-4 font-sans italic opacity-50">-- Iniciando sequenciador de eventos de Lilith --</p>
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 group border-l border-transparent hover:border-primary/30 hover:bg-primary/5 pl-2 transition-all">
                    <span className="text-muted-foreground/45 select-none w-8 inline-block">{(i+1).toString().padStart(3, '0')}</span>
                    <p className="flex-1 break-all leading-relaxed tracking-tight group-hover:text-green-400">{log}</p>
                  </div>
                ))}
                <div ref={logsEndRef} />
                <div className="flex gap-2 items-center text-primary mt-2">
                   <span className="animate-pulse">_</span>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t border-border p-2 bg-muted/50 backdrop-blur-sm z-10">
             <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold text-muted-foreground hover:text-primary w-full h-8 tracking-widest" onClick={fetchLogs}>
               Limpar & Recarregar Buffer de Memória
             </Button>
          </CardFooter>
        </Card>

        {/* System Health & Controls */}
        <div className="space-y-6 flex flex-col h-[600px]">
          
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 font-sans">
                <Activity className="h-4 w-4" /> Telemetria de Hardware
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Cpu size={10} /> CPU Load</span>
                  <span className="font-mono">{cpuUsage}%</span>
                </div>
                <Progress value={cpuUsage} className="h-1 bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><Server size={10} /> RAM Usage</span>
                  <span className="font-mono text-primary">{memUsage}%</span>
                </div>
                <Progress value={memUsage} className="h-1 bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                 <div className="p-3 rounded border border-border bg-muted/5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Uptime</p>
                    <p className="text-xs font-mono font-bold mt-1">14d 06h 22m</p>
                 </div>
                 <div className="p-3 rounded border border-border bg-muted/5">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground">Ping</p>
                    <p className="text-xs font-mono font-bold mt-1 text-green-500">12ms</p>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2 font-sans">
                <Zap className="h-4 w-4 text-primary" /> Protocolos de Automação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Scraping Puppeteer</Label>
                  <p className="text-[10px] text-muted-foreground italic font-sans">Extração massiva de dados</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Risk Sentinel</Label>
                  <p className="text-[10px] text-muted-foreground italic font-sans">Monitor de liquidez em tempo real</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
              <div className="flex items-center justify-between group">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Lilith Neuro-Link</Label>
                  <p className="text-[10px] text-muted-foreground italic font-sans">Processamento de linguagem natural</p>
                </div>
                <Switch defaultChecked className="data-[state=checked]:bg-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2 font-sans">
                  <Database className="h-4 w-4 text-primary" /> Memory Core Status
                </CardTitle>
                <Button onClick={fetchStats} disabled={loading} size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/10">
                   <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-2 bg-muted/5">
               <ScrollArea className="h-full w-full">
                  <div className="p-4 space-y-3">
                     {stats?.chats && stats.chats.slice(0, 10).map((chat: any) => (
                       <div key={chat.id} className="p-2 border border-border/40 rounded bg-background/40 flex items-center justify-between group hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-muted group-hover:bg-primary transition-colors" />
                             <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground">{chat.id}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold text-primary font-mono">{chat.size}</Badge>
                       </div>
                     ))}
                     {(!stats?.chats || stats.chats.length === 0) && (
                        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest pt-10 opacity-30">Nenhum setor de memória alocado</p>
                     )}
                  </div>
               </ScrollArea>
            </CardContent>
            <CardFooter className="py-2 px-4 border-t border-border flex justify-between bg-muted/10 backdrop-blur-sm">
               <div className="flex items-center gap-2">
                  <Globe size={10} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground uppercase font-sans tracking-tight">Sync: {lastSync || '--:--'}</span>
               </div>
               <div className="flex items-center gap-1 text-[9px] text-primary font-bold uppercase tracking-tighter">
                  <Lock size={10} /> Encrypted
               </div>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  )
}





