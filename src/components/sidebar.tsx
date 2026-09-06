"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Megaphone,
  BookOpen,
  Database,
  TrendingUp,
  Gavel,
  FileVideo,
  Settings,
  Terminal,
  Search,
  MessageSquare,
  CreditCard
} from "lucide-react"

const sidebarItems = [
  { name: "Painel Principal", href: "/dashboard", icon: LayoutDashboard },
  { name: "Google Ads", href: "/dashboard/ads", icon: Megaphone },
  { name: "Obsidian Vault", href: "/dashboard/obsidian", icon: BookOpen },
  { name: "Trading OKX", href: "/dashboard/trading", icon: TrendingUp },
  { name: "Pagamentos", href: "/dashboard/payments", icon: CreditCard },
  { name: "Bot Logs", href: "/dashboard/logs", icon: MessageSquare },
  { name: "Terminal", href: "/dashboard/terminal", icon: Terminal },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex flex-col h-screen w-64 border-r bg-muted/30">
      <div className="p-6 flex items-center gap-2 font-semibold text-lg">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">L</div>
        <span>Lilith Brain</span>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === item.href 
                  ? "bg-accent text-accent-foreground font-medium" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}



