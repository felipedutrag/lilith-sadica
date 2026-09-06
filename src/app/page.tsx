"use client"

import { useState, useEffect } from "react"
import { useDashboardData } from "@/hooks/useDashboardData"
import { useLilithVoice } from "@/hooks/useLilithVoice"
import { DashboardHeader } from "@/components/dashboard/layout/DashboardHeader"
import { DashboardSidebarContent } from "@/components/dashboard/layout/DashboardSidebarContent"
import { LilithCore } from "@/components/dashboard/layout/LilithCore"
import { CommandCenter } from "@/components/dashboard/widgets/CommandCenter"
import { NeuralStream } from "@/components/dashboard/widgets/NeuralStream"
import { CustomComponentCard } from "@/components/dashboard/widgets/CustomComponentCard"

import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, Wallet, X, Keyboard } from "lucide-react"

import GridTradingDashboard from "@/components/dashboard/GridTradingDashboard"
import ProfitChart from "@/components/dashboard/ProfitChart"
import GoogleAdsDashboard from "@/components/dashboard/GoogleAdsDashboard"
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard"
import GGPixDashboard from "@/components/dashboard/GGPixDashboard"
import ObsidianDashboard from "@/components/dashboard/ObsidianDashboard"
import MediaDashboard from "@/components/dashboard/MediaDashboard"
import SystemDashboard from "@/components/dashboard/SystemDashboard"
import RitualsDashboard from "@/components/dashboard/RitualsDashboard"
import SettingsDashboard from "@/components/dashboard/SettingsDashboard"
import GoogleDocsDashboard from "@/components/dashboard/GoogleDocsDashboard"
import DualVoiceDashboard from "@/components/dashboard/DualVoiceDashboard"
import LegalDashboard from "@/components/dashboard/LegalDashboard"
import { resetLayout } from "@/actions/agent"
import { getApiUrl } from "@/lib/utils"

export default function DashboardPage() {
  const [isDemo, setIsDemo] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isNewNotification, setIsNewNotification] = useState(false)

  const { adsSummary, customLayout, todos, notifications, fetchTodos, fetchNotifications } = useDashboardData(isDemo)
  const { isRecordingVoice, isReadyToSpeak, isSpeaking, toggleVoiceRecording, sendTextToVoice, sessionId } = useLilithVoice()

  useEffect(() => {
    const savedDemo = localStorage.getItem('isDemo')
    if (savedDemo !== null) {
      // eslint-disable-next-line
      setIsDemo(savedDemo !== 'false')
    }
    
    const savedTab = localStorage.getItem("lilith_active_tab")
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])

  const handleResetLayout = async () => {
    await resetLayout()
    window.location.reload()
  }

  const getCardDetails = (index: number, defaultTitle: string, defaultVal: string, defaultDesc: string) => {
    const custom = customLayout?.cards?.find(c => c.index === index)
    return custom ? { titulo: custom.titulo, valor: custom.valor, descricao: custom.descricao } : { titulo: defaultTitle, valor: defaultVal, descricao: defaultDesc }
  }

  return (
    <div className="dark h-screen bg-black text-foreground selection:bg-primary selection:text-primary-foreground relative overflow-hidden flex flex-col p-2">
      {/* Background Embers and Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-x-0 bottom-0 h-[10%] bg-gradient-to-t from-red-950 via-red-900/30 via-red-800/5 to-transparent blur-[50px] animate-pulse opacity-75" />
      </div>

      {/* MOBILE AI FOCUS VIEW */}
      <div className="flex lg:hidden flex-col h-full w-full bg-zinc-950 relative z-20 rounded-xl border border-border shadow-2xl overflow-hidden p-3 gap-3">
        <div className="shrink-0">
          <LilithCore isRecordingVoice={isRecordingVoice} isReadyToSpeak={isReadyToSpeak} isSpeaking={isSpeaking} toggleVoiceRecording={toggleVoiceRecording} />
        </div>
        <div className="flex-1 min-h-0">
          <NeuralStream isRecordingVoice={isRecordingVoice} sendTextToVoice={sendTextToVoice} sessionId={sessionId} />
        </div>
      </div>

      {/* DESKTOP FULL VIEW */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); localStorage.setItem("lilith_active_tab", val) }} className="hidden lg:flex relative z-10 w-full h-full overflow-hidden bg-transparent gap-1">
        
        <aside className="w-full lg:w-64 shrink-0 flex flex-col border border-border bg-zinc-950 h-full overflow-y-auto rounded-t-xl lg:rounded-l-xl lg:rounded-r-none shadow-2xl relative z-20">
          <DashboardSidebarContent isRecordingVoice={isRecordingVoice} isReadyToSpeak={isReadyToSpeak} isSpeaking={isSpeaking} toggleVoiceRecording={toggleVoiceRecording} />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-zinc-950 border border-border rounded-r-xl shadow-2xl">
          <div className="flex-1 flex flex-col h-full pl-6 md:pl-8">
            <div className="flex-1 overflow-y-auto pr-6 md:pr-8 pt-4 md:pt-5 space-y-5">
              <DashboardHeader 
                isNewNotification={isNewNotification} 
                setShowNotifications={setShowNotifications} 
                showNotifications={showNotifications} 
                setShowHotkeys={setShowHotkeys}
                notifications={notifications}
                fetchNotifications={fetchNotifications}
                setIsNewNotification={setIsNewNotification}
              />

              <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500 relative pb-10">
                {customLayout && (
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Custom Layout active
                    </span>
                    <button onClick={handleResetLayout} className="text-[9px] uppercase font-mono text-zinc-500 hover:text-red-500 hover:underline">Resetar Layout</button>
                  </div>
                )}

                <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[0, 1, 2].map(idx => {
                    const defaults = [
                      { t: "Conversões e Receita", v: `R$ ${adsSummary.conversionsValue.toLocaleString('pt-BR')}`, d: `${adsSummary.conversions} vendas (7d)` },
                      { t: "Retorno (ROI & ROAS)", v: `${adsSummary.roi.toFixed(1)}% ROI`, d: `ROAS de ${adsSummary.roas.toFixed(2)}x` },
                      { t: "Investimento em Ads", v: `R$ ${adsSummary.cost.toLocaleString('pt-BR')}`, d: `${adsSummary.clicks} Cliques` }
                    ][idx]
                    const card = getCardDetails(idx, defaults.t, defaults.v, defaults.d)
                    return (
                      <Card key={idx} className="h-full bg-card border-border shadow-sm hover:border-primary/20 transition-all duration-300">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{card.titulo}</CardTitle>
                          {idx === 0 ? <Target className="h-4 w-4 text-zinc-600" /> : idx === 1 ? <TrendingUp className="h-4 w-4 text-zinc-600" /> : <Wallet className="h-4 w-4 text-zinc-600" />}
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="text-2xl font-semibold text-zinc-100">{card.valor}</div>
                          <p className="text-[9px] text-zinc-500 mt-2 font-mono uppercase">{card.descricao}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </main>

                {customLayout?.componentes && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {customLayout.componentes.map(comp => <CustomComponentCard key={comp.id} comp={comp} />)}
                  </div>
                )}

                {customLayout?.exibir_grafico !== false && <section className="w-full"><ProfitChart /></section>}

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <CommandCenter />
                  <NeuralStream isRecordingVoice={isRecordingVoice} sendTextToVoice={sendTextToVoice} sessionId={sessionId} />
                </section>
              </TabsContent>

              <TabsContent value="rituals"><RitualsDashboard todos={todos} onRefresh={fetchTodos} getApiUrl={getApiUrl} /></TabsContent>
              <TabsContent value="okx"><GridTradingDashboard isDemo={isDemo} onModeChange={setIsDemo} /></TabsContent>
              <TabsContent value="ads"><GoogleAdsDashboard /></TabsContent>
              <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
              <TabsContent value="ggpix"><GGPixDashboard /></TabsContent>
              <TabsContent value="obsidian"><ObsidianDashboard /></TabsContent>
              <TabsContent value="docs"><GoogleDocsDashboard getApiUrl={getApiUrl} /></TabsContent>
              <TabsContent value="legal"><LegalDashboard getApiUrl={getApiUrl} /></TabsContent>
              <TabsContent value="media"><MediaDashboard /></TabsContent>
              <TabsContent value="system"><SystemDashboard /></TabsContent>
              <TabsContent value="settings"><SettingsDashboard /></TabsContent>
              <TabsContent value="dual-voice"><DualVoiceDashboard /></TabsContent>
            </div>
          </div>
        </div>
      </Tabs>

      {/* Hotkeys Modal */}
      {showHotkeys && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowHotkeys(false)}>
          <Card className="w-full max-w-2xl bg-zinc-950 border-zinc-800 p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-100 flex items-center gap-2"><Keyboard size={20} /> Atalhos Neurais</h2>
              <X className="cursor-pointer text-zinc-500 hover:text-zinc-200" onClick={() => setShowHotkeys(false)} />
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs text-zinc-400">
               <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>Ctrl + L</span><span className="text-red-500">Lilith Voice</span></div>
               <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>F1 - F10</span><span className="text-amber-500">Tabs</span></div>
               <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>Ctrl + D</span><span className="text-emerald-500">Demo/Live</span></div>
               <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>?</span><span className="text-blue-500">Hotkeys</span></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
