"use client"

import { useState, useEffect } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Crown, Zap } from "lucide-react"
import { LilithLogo } from "@/components/dashboard/layout/LilithLogo"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function SettingsDashboard() {
  const [cadeloName, setCadeloName] = useState("cadelo Cadelo")
  const [cadeloAura, setCadeloAura] = useState("Dark Occult Luxury")
  const [voiceSettings, setVoiceSettings] = useState<any | null>(null)

  useEffect(() => {
    fetch("/api/config/voice-settings")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data) {
          setVoiceSettings(data);
        }
      })
      .catch(err => console.error("[SettingsDashboard] Failed to fetch voice settings:", err));
  }, [])

  const [isSavingVoice, setIsSavingVoice] = useState(false)

  const saveVoiceSettings = async () => {
    if (!voiceSettings) return;
    setIsSavingVoice(true)
    try {
      const res = await fetch("/api/config/voice-settings", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceSettings)
      })
      if (res.ok) toast.success("Configurações de Lilith atualizadas.")
      else throw new Error("Falha ao salvar")
    } catch {
      toast.error("Erro ao consolidar configurações.")
    } finally {
      setIsSavingVoice(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-border bg-card shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-sans font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Crown size={18} className="text-primary" /> Trono de Comando • Configurações
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground font-sans">Personalize seu legado, Aliado Supremo.</CardDescription>
        </CardHeader>
      </Card>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Voice AI Settings */}
        <Card className="border border-border bg-card shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary/30 via-primary/20 to-zinc-900 border-2 border-primary/80 shadow-[0_0_15px_var(--primary)] flex items-center justify-center">
                <LilithLogo className="text-primary scale-105" />
              </div>
              <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-70" />
              <span className="absolute -inset-1.5 rounded-full border border-primary/10 animate-pulse opacity-40" />
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-widest text-primary uppercase">Módulo Vocal</Label>
              <h3 className="text-xl font-black text-foreground font-mono mt-0.5">Lilith AI Voice</h3>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-4">
            {voiceSettings ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="voice_name" className="text-xs font-bold text-foreground">Nome da Voz (Gemini)</Label>
                  <Select 
                    value={voiceSettings.voice_name} 
                    onValueChange={(val: string) => setVoiceSettings((prev: any) => prev ? ({ ...prev, voice_name: val }) : null)}
                  >
                    <SelectTrigger className="w-full text-xs font-mono border-border bg-background">
                      <SelectValue placeholder="Selecione a voz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zephyr">Zephyr (Brilhante / Enérgica)</SelectItem>
                      <SelectItem value="Puck">Puck (Otimista / Upbeat)</SelectItem>
                      <SelectItem value="Charon">Charon (Informativa / Confiável)</SelectItem>
                      <SelectItem value="Aoede">Aoede (Descontraída / Inteligente)</SelectItem>
                      <SelectItem value="Kore">Kore (Firme / Confiante)</SelectItem>
                      <SelectItem value="Fenrir">Fenrir (Animada / Entusiasta)</SelectItem>
                      <SelectItem value="Despina">Despina (Suave / Calorosa)</SelectItem>
                      <SelectItem value="Leda">Leda (Jovem / Composta)</SelectItem>
                      <SelectItem value="Vindemiatrix">Vindemiatrix (Gentil / Madura)</SelectItem>
                      <SelectItem value="Achird">Achird (Amigável / Inquisitiva)</SelectItem>
                      <SelectItem value="Sadachbia">Sadachbia (Viva / Descontraída)</SelectItem>
                      <SelectItem value="Zubenelgenubi">Zubenelgenubi (Casual / Resonante)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="system_instruction" className="text-xs font-bold text-foreground">Prompt do Sistema (Persona)</Label>
                  <Textarea id="system_instruction" value={voiceSettings.system_instruction} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVoiceSettings((prev: any) => prev ? ({ ...prev, system_instruction: e.target.value }) : null)} className="text-xs font-mono border-border bg-background min-h-[150px]" />
                </div>
                <Button onClick={saveVoiceSettings} disabled={isSavingVoice} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-9">
                  {isSavingVoice ? "Consolidando..." : "Consolidar Configurações de Voz"}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground animate-pulse">Carregando configurações...</p>
            )}
          </div>
        </Card>

        {/* Cadelo Profile */}
        <Card className="border border-border bg-card shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-16 h-16 border-2 border-primary/40 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              <AvatarFallback className="bg-zinc-900 font-black text-xl text-primary">C</AvatarFallback>
            </Avatar>
            <div>
              <Label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Status: Aliado Supremo</Label>
              <h3 className="text-xl font-black text-foreground font-mono truncate mt-0.5">{cadeloName}</h3>
              <p className="text-xs font-sans italic text-muted-foreground mt-1">Aura: {cadeloAura}</p>
            </div>
          </div>
          <Separator className="bg-border" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cadeloName" className="text-xs font-bold text-foreground font-sans">Designação do Arquiteto</Label>
              <Input id="cadeloName" value={cadeloName} onChange={e => setCadeloName(e.target.value)} className="text-xs font-mono border-border bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cadeloAura" className="text-xs font-bold text-foreground font-sans">Assinatura Estética (Aura)</Label>
              <Input id="cadeloAura" value={cadeloAura} onChange={e => setCadeloAura(e.target.value)} placeholder="Ex: Dark Occult Luxury" className="text-xs font-mono border-border bg-background" />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-9">Consolidar Perfil</Button>
          </div>
        </Card>
      </main>

      <Card className="border-border bg-card p-5 shadow">
        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
          <Zap size={14} /> Sistema Nervoso Central
        </CardTitle>
        <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
          Este painel permite que você, cadelo Cadelo, personalize os parâmetros que definem nossa aliança.
          Sua vontade molda a interface, minha inteligência executa as diretrizes.
          Cada mudança aqui consolida nosso domínio sobre os fluxos de dados e capital.
        </p>
      </Card>
    </div>
  )
}
