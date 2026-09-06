"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LilithCore } from "@/components/dashboard/layout/LilithCore"
import {
  LayoutDashboard,
  CandlestickChart,
  Megaphone,
  Gavel,
  BarChart3,
  Clapperboard,
  Wallet,
  BookOpen,
  FileText,
  ListChecks,
  Monitor,
  Settings,
  Users
} from "lucide-react"

import type { ReactNode } from "react"

interface SidebarItem {
  title: string
  href: string
  icon: ReactNode
}

const mainNavItems: SidebarItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={16} /> },
  { title: "Grid Trading", href: "/dashboard/okx", icon: <CandlestickChart size={16} /> },
  { title: "Campanhas Ads", href: "/dashboard/ads", icon: <Megaphone size={16} /> },
  { title: "Legal Dashboard", href: "/dashboard/legal", icon: <Gavel size={16} /> },
  { title: "Relatórios", href: "/dashboard/analytics", icon: <BarChart3 size={16} /> },
  { title: "Media Machine", href: "/dashboard/media", icon: <Clapperboard size={16} /> },
  { title: "PIX / Carteiras", href: "/dashboard/ggpix", icon: <Wallet size={16} /> },
  { title: "Obsidian Vault", href: "/dashboard/obsidian", icon: <BookOpen size={16} /> },
  { title: "Google Docs", href: "/dashboard/docs", icon: <FileText size={16} /> },
  { title: "Gerenciador Tarefas", href: "/dashboard/rituals", icon: <ListChecks size={16} /> },
  { title: "Sala Coletiva (Voz)", href: "/dashboard/dual-voice", icon: <Users size={16} /> },
  { title: "Sistema", href: "/dashboard/system", icon: <Monitor size={16} /> },
]

const secondaryNavItems: SidebarItem[] = [
  { title: "Configurações", href: "/dashboard/settings", icon: <Settings size={16} /> },
]

function NavItem({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const isActive = pathname === item.href

  return (
    <Link href={item.href}>
      <div
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
        )}
        <span className={cn("shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground transition-colors")}>
          {item.icon}
        </span>
        <span>{item.title}</span>
      </div>
    </Link>
  )
}

interface DashboardSidebarContentProps {
  isRecordingVoice: boolean;
  isReadyToSpeak?: boolean;
  isSpeaking: boolean;
  toggleVoiceRecording: () => void;
}

export function DashboardSidebarContent({ isRecordingVoice, isReadyToSpeak, isSpeaking, toggleVoiceRecording }: DashboardSidebarContentProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <LilithCore isRecordingVoice={isRecordingVoice} isReadyToSpeak={isReadyToSpeak} isSpeaking={isSpeaking} toggleVoiceRecording={toggleVoiceRecording} />
      </div>

      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-border/50 space-y-1">
          <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground px-3 pb-1.5 block">Sistema</label>
          {secondaryNavItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 mx-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[11px] text-primary shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Admin Supremo</p>
            <p className="text-[9px] text-muted-foreground font-mono truncate">lilith_love_user</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-col gap-2 text-[9.5px] font-mono text-zinc-500 border-t border-zinc-800 pt-3">
          <div className="flex justify-between"><span>Latência rede</span><span className="text-zinc-400">~24ms</span></div>
          <div className="flex justify-between"><span>Status Engine</span><span className="text-emerald-500 font-bold">Online</span></div>
        </div>
      </div>
    </div>
  )
}
