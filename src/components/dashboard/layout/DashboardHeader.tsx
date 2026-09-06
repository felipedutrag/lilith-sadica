"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { Bell, Keyboard } from "lucide-react"
import { getApiUrl } from "@/lib/utils"
import { useEffect, useRef } from "react"

import { Notification } from "@/hooks/useDashboardData"

interface DashboardHeaderProps {
  isNewNotification: boolean;
  setShowNotifications: (show: boolean) => void;
  showNotifications: boolean;
  setShowHotkeys: (show: boolean) => void;
  notifications: Notification[];
  fetchNotifications: () => void;
  setIsNewNotification: (isNew: boolean) => void;
}

export function DashboardHeader({
  isNewNotification,
  setShowNotifications,
  showNotifications,
  setShowHotkeys,
  notifications,
  fetchNotifications,
  setIsNewNotification
}: DashboardHeaderProps) {
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications, setShowNotifications]);

  return (
    <header className="flex justify-between items-center mb-4 gap-4 pb-2 border-b border-border shrink-0">
      <div>
        <h1 className="text-sm font-bold tracking-wider text-zinc-200 uppercase font-sans">
          Painel Operacional
        </h1>
        <span className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase block">
          Lilith Engine • Command Room
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-border text-muted-foreground px-2 py-0.5 text-[8px] font-mono bg-background/40">
          LILITH OS
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHotkeys(true)}
          className="h-7 w-7 text-muted-foreground hover:text-amber-400"
        >
          <Keyboard size={12} />
        </Button>

        <div className="relative" ref={notificationRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowNotifications(!showNotifications);
            }}
            className="relative h-7 w-7 text-muted-foreground hover:text-foreground rounded hover:bg-muted/30"
          >
            <Bell size={13} />
            {isNewNotification && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b border-border flex justify-between items-center bg-background/40">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-foreground">NOTIFICAÇÕES NEURAIS</span>
                <button
                  onClick={() => {
                    fetch(getApiUrl("/api/notifications"), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'read' })
                    })
                      .then(() => {
                        fetchNotifications();
                        setIsNewNotification(false);
                        setShowNotifications(false);
                      });
                  }}
                  className="text-[9px] uppercase font-mono text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-border/30 font-sans text-xs">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground/60 font-mono text-[10px] uppercase">
                    Nenhum sinal detectado.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 border-l-2 border-border/30 flex flex-col gap-1">
                      <p className="leading-snug text-[11px] font-medium">{n.message}</p>
                      <span className="text-[8px] font-mono text-muted-foreground">{new Date(n.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <ModeToggle />
      </div>
    </header>
  )
}




