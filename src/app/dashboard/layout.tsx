"use client"

import { DashboardProvider, useDashboard } from "@/contexts/dashboard"
import { DashboardHeader } from "@/components/dashboard/layout/DashboardHeader"
import { DashboardSidebarContent } from "@/components/dashboard/layout/DashboardSidebarContent"
import { LilithCore } from "@/components/dashboard/layout/LilithCore"
import { NeuralStream } from "@/components/dashboard/widgets/NeuralStream"
import { Keyboard, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ReactNode } from "react"

function DashboardShell({ children }: { children: ReactNode }) {
  const {
    isRecordingVoice, isReadyToSpeak, isSpeaking, toggleVoiceRecording, sendTextToVoice, sessionId,
    showHotkeys, setShowHotkeys,
    showNotifications, setShowNotifications,
    isNewNotification, setIsNewNotification,
    notifications, fetchNotifications,
  } = useDashboard()

  return (
    <div className="dark h-screen bg-black text-foreground selection:bg-primary selection:text-primary-foreground relative overflow-hidden flex flex-col p-2">
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
      <div className="hidden lg:flex flex-col lg:flex-row relative z-10 w-full h-full overflow-hidden bg-transparent gap-1">
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
              {children}
            </div>
          </div>
        </div>
      </div>

      {showHotkeys && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowHotkeys(false)}>
          <Card className="w-full max-w-2xl bg-zinc-950 border-zinc-800 p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-100 flex items-center gap-2"><Keyboard size={20} /> Atalhos Neurais</h2>
              <X className="cursor-pointer text-zinc-500 hover:text-zinc-200" onClick={() => setShowHotkeys(false)} />
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono text-xs text-zinc-400">
              <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>Ctrl + L</span><span className="text-red-500">Lilith Voice</span></div>
              <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>Ctrl + D</span><span className="text-emerald-500">Demo/Live</span></div>
              <div className="flex justify-between p-2 bg-zinc-900/50 rounded"><span>?</span><span className="text-blue-500">Hotkeys</span></div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  )
}
