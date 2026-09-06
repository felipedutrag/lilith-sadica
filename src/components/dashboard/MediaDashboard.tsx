"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

import { 
  Video, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Zap, 
  Wand2, 
  Film, 
  RefreshCw,
  Image as ImageIcon2,
  Share2,
  Layers
} from "lucide-react"
import { toast } from "sonner"

export default function MediaDashboard() {
  const [scriptId, setScriptId] = useState("")

  useEffect(() => {
    // eslint-disable-next-line
    setScriptId(Math.random().toString(36).substring(7).toUpperCase())
  }, [])

  // Image State
  const [imagePrompt, setImagePrompt] = useState("Lillith, the queen of chaos, dark occult luxury style, cinematic lighting, 8k")
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  // TikTok State
  const [tiktokTema, setTiktokTema] = useState("A numerologia oculta por trás da sua data de nascimento")
  const [tiktokScript, setTiktokScript] = useState("")
  const [tiktokLoading, setTiktokLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateImage = async () => {
    if (!imagePrompt) return
    setImageLoading(true)
    setGeneratedImage(null)
    addLog(`Invocando rede neural para materializar: "${imagePrompt.substring(0, 30)}..."`)
    try {
      const res = await fetch("/api/media/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        setGeneratedImage(url)
        toast.success("Imagem materializada com sucesso.")
      } else {
        toast.error("Falha na síntese visual.")
      }
    } catch (e) {
      console.error(e)
    }
    setImageLoading(false)
  }

  const generateTiktok = async () => {
    if (!tiktokTema) return
    setTiktokLoading(true)
    setTiktokScript("")
    addLog(`Arquitetando narrativa viral para o tema: ${tiktokTema}`)
    try {
      const res = await fetch("/api/media/tiktok-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema: tiktokTema })
      })
      const data = await res.json()
      if (data.status === "success") {
        setTiktokScript(data.roteiro)
        toast.success("Roteiro finalizado.")
      }
    } catch (e) {
      toast.error("Erro no processador de linguagem.")
    }
    setTiktokLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success("Copiado para a área de transferência.")
    setTimeout(() => setCopied(false), 2000)
  }

  const [logs, setLogs] = useState<string[]>([])
  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  return (
    <div className="space-y-6">
      {/* Media Header */}
      <Card className="border-border bg-card shadow-sm overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
        <CardHeader className="relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse" /> Fábrica de Influência e Caos
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-sans mt-1">Criação de ativos de dominação cultural e narrativa.</CardDescription>
            </div>
            <div className="flex gap-2">
               <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">GPU_ACCELERATED</Badge>
               <Badge variant="outline" className="border-border">NEURAL_V4</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Image Generation - Left Column */}
        <Card className="border-border bg-card shadow-sm flex flex-col overflow-hidden h-[750px] lg:col-span-7">
          <CardHeader className="pb-4 border-b border-border/30 bg-muted/5">
            <div className="flex justify-between items-center">
               <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2 text-foreground font-bold">
                 <ImageIcon2 size={16} className="text-primary" /> Alquimia Visual (Nano Banana)
               </CardTitle>
               <Layers size={14} className="text-muted-foreground opacity-30" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col pt-6">
            <div className="flex gap-2 p-1 bg-background/45 rounded-lg border border-border/30 shadow-inner">
              <Input 
                placeholder="Descreva a realidade desejada (Estética Lilith padrão)..." 
                className="bg-transparent border-none text-xs focus-visible:ring-0 placeholder:opacity-30 h-10" 
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
              />
              <Button onClick={generateImage} disabled={imageLoading} className="bg-primary text-primary-foreground shrink-0 font-bold uppercase tracking-tighter text-xs px-6 hover:scale-105 transition-transform h-10">
                {imageLoading ? "Materializando..." : "Invocação"}
                <Zap size={14} className="ml-2" />
              </Button>
            </div>
            
            <div className="flex-1 rounded-xl border border-border bg-background overflow-hidden relative group shadow-2xl">
              {generatedImage ? (
                <>
                  <img src={generatedImage} alt="Generated" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-6 backdrop-blur-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Ativo Processado</p>
                    <div className="flex gap-4">
                       <a href={generatedImage} download="lilith_asset.png" className="bg-primary p-3 rounded-full text-white hover:scale-110 transition-transform">
                         <Download size={24} />
                       </a>
                       <Button variant="outline" className="border-border p-3 rounded-full text-white hover:bg-white/10" onClick={() => copyToClipboard(generatedImage)}>
                         <Share2 size={24} />
                       </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                   <div className="w-20 h-20 rounded-full border border-dashed border-border/40 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                      <Wand2 size={32} className="opacity-20" />
                   </div>
                   <div className="text-center space-y-1">
                      <p className="text-xs font-bold uppercase tracking-tighter">Aguardando comando criativo</p>
                      <p className="text-[10px] opacity-40 font-mono italic px-10">Defina o prompt acima para iniciar a síntese neural</p>
                   </div>
                </div>
              )}
              {imageLoading && (
                <div className="absolute inset-0 bg-background/90 flex flex-center flex-col items-center justify-center z-10 animate-in fade-in duration-500">
                   <div className="relative">
                      <div className="w-24 h-24 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Zap size={24} className="text-primary animate-pulse" />
                      </div>
                   </div>
                   <div className="mt-8 text-center space-y-2">
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary animate-pulse">Materializando Realidade</p>
                      <p className="text-[9px] text-muted-foreground font-mono opacity-50">Sintonizando canais dimensionais...</p>
                   </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TikTok & Narrative - Right Column */}
        <div className="lg:col-span-5 space-y-6 flex flex-col h-[750px]">
           <Card className="border-border bg-card shadow-sm flex flex-col overflow-hidden flex-1">
              <CardHeader className="pb-4 border-b border-border/30 bg-muted/5">
                <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                  <Film size={16} className="text-primary" /> Roteirista TikTok (Viral-Loop)
                </CardTitle>
                <CardDescription className="text-[10px]">Scripts de alta retenção baseados no algoritmo de Lilith.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col pt-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Tema da Narrativa</label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Tema do vídeo..." 
                      className="bg-background text-xs h-10 border-border focus:border-primary/50" 
                      value={tiktokTema}
                      onChange={e => setTiktokTema(e.target.value)}
                    />
                    <Button onClick={generateTiktok} disabled={tiktokLoading} className="bg-primary text-primary-foreground font-bold px-4 h-10">
                      {tiktokLoading ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 bg-background border border-border rounded-xl overflow-hidden flex flex-col relative shadow-inner">
                  <div className="py-2 px-4 border-b border-border/30 flex justify-between items-center bg-muted/30">
                     <Badge variant="outline" className="text-[9px] text-primary font-mono tracking-tighter">SCRIPT_ID: {scriptId || "--------"}</Badge>
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                       onClick={() => tiktokScript && copyToClipboard(tiktokScript)}
                     >
                       {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                     </Button>
                  </div>
                  <ScrollArea className="flex-1 p-0">
                    <div className="p-6">
                      {tiktokScript ? (
                        <div className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed selection:bg-primary selection:text-white">
                          {tiktokScript}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-20 gap-4">
                           <Video size={48} />
                           <p className="text-[10px] font-bold uppercase tracking-widest">Aguando Diretrizes</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  {tiktokLoading && (
                    <div className="absolute inset-0 bg-background/85 flex flex-center flex-col items-center justify-center z-10 backdrop-blur-sm">
                       <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                       <p className="text-[10px] font-bold uppercase tracking-widest text-primary animate-pulse">Sintonizando Algoritmo</p>
                    </div>
                  )}
                </div>
              </CardContent>
           </Card>

           {/* Activity Log for Media */}
           <Card className="border-border bg-card h-[180px] overflow-hidden flex flex-col">
              <CardHeader className="py-2 px-4 border-b border-border/35 bg-muted/50">
                 <CardTitle className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground">Media System Logs</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                 <ScrollArea className="h-full w-full p-4">
                    <div className="space-y-1 font-mono text-[9px] text-muted-foreground/70">
                       {logs.map((log, i) => (
                         <div key={i} className="flex gap-2">
                            <span className="text-primary/40 select-none">&gt;</span>
                            <p>{log}</p>
                         </div>
                       ))}
                       {logs.length === 0 && <p className="opacity-30 italic">Nenhuma atividade registrada.</p>}
                    </div>
                 </ScrollArea>
              </CardContent>
           </Card>
        </div>

      </div>
    </div>
  )
}





