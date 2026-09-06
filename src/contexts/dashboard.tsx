"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useLilithVoice } from "@/hooks/useLilithVoice"
import { getApiUrl } from "@/lib/utils"
import { supabase } from "@/lib/supabase"

export interface CustomCard {
  index: number;
  titulo: string;
  valor: string;
  descricao: string;
}

export interface CustomComponente {
  id: string;
  tipo: "progresso" | "lista" | "alerta" | "texto" | "tabela";
  titulo: string;
  descricao?: string;
  grade_colunas: number;
  valor_progresso?: number;
  itens_lista?: { rotulo: string; valor: string; status?: "normal" | "sucesso" | "alerta" | "perigo" }[];
  conteudo_texto?: string;
}

export interface CustomLayoutState {
  cards?: CustomCard[];
  componentes?: CustomComponente[];
  okx_screener?: {
    titulo?: string;
    descricao?: string;
    tickers?: { instId: string; last: number; change24h: number }[];
  };
  exibir_grafico?: boolean;
  largura_grafico?: number;
  exibir_scanner?: boolean;
  largura_scanner?: number;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  created_at: string;
}

interface DashboardContextType {
  isDemo: boolean;
  setIsDemo: (d: boolean) => void;
  adsSummary: { cost: number; clicks: number; impressions: number; conversions: number; conversionsValue: number; roi: number; roas: number };
  customLayout: CustomLayoutState | null;
  todos: Todo[];
  notifications: Notification[];
  fetchTodos: () => void;
  fetchNotifications: () => void;
  isRecordingVoice: boolean;
  isSpeaking: boolean;
  sessionId: string;
  toggleVoiceRecording: () => void;
  sendTextToVoice: (text: string) => boolean;
  showHotkeys: boolean;
  setShowHotkeys: (s: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (s: boolean) => void;
  isNewNotification: boolean;
  setIsNewNotification: (s: boolean) => void;
  isReadyToSpeak: boolean;
}

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemoState] = useState(true)
  const [adsSummary, setAdsSummary] = useState({ cost: 0, clicks: 0, impressions: 0, conversions: 0, conversionsValue: 0, roi: 0, roas: 0 })
  const [customLayout, setCustomLayout] = useState<CustomLayoutState | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showHotkeys, setShowHotkeys] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isNewNotification, setIsNewNotification] = useState(false)
  const { isRecordingVoice, isReadyToSpeak, isSpeaking, toggleVoiceRecording, sendTextToVoice, sessionId } = useLilithVoice()

  const setIsDemo = useCallback((d: boolean) => {
    setIsDemoState(d)
    localStorage.setItem('isDemo', String(d))
  }, [])

  useEffect(() => {
    const savedDemo = localStorage.getItem('isDemo')
    // eslint-disable-next-line
    if (savedDemo !== null) setIsDemoState(savedDemo !== 'false')
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const safeFetch = (url: string) => fetch(url).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const ct = res.headers.get("content-type")
          if (!ct || !ct.includes("application/json")) throw new Error("Resposta não é JSON")
          return res.json()
        })

        const [adsRes] = await Promise.all([
          safeFetch(getApiUrl("/api/campaigns/report?days=7")).catch(() => ({ status: 'error' }))
        ])

        if (adsRes.status === 'success' && adsRes.report) {
          const totals = adsRes.report.reduce((acc: any, curr: any) => {
            acc.cost += curr.cost || 0
            acc.clicks += curr.clicks || 0
            acc.impressions += curr.impressions || 0
            acc.conversions += curr.conversions || 0
            acc.conversionsValue += curr.conversionsValue || 0
            return acc
          }, { cost: 0, clicks: 0, impressions: 0, conversions: 0, conversionsValue: 0 })

          setAdsSummary({
            ...totals,
            roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
            roi: totals.cost > 0 ? ((totals.conversionsValue - totals.cost) / totals.cost) * 100 : 0
          })
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTodos = useCallback(() => {
    const safeFetch = (url: string) => fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const ct = res.headers.get("content-type")
      if (!ct || !ct.includes("application/json")) throw new Error("Resposta não é JSON")
      return res.json()
    })

    safeFetch(getApiUrl("/api/todos"))
      .then(data => data.status === 'success' && setTodos(data.todos))
      .catch(err => console.error("Error fetching todos", err))
  }, [])

  const fetchNotifications = useCallback(() => {
    const safeFetch = (url: string) => fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const ct = res.headers.get("content-type")
      if (!ct || !ct.includes("application/json")) throw new Error("Resposta não é JSON")
      return res.json()
    })

    safeFetch(getApiUrl("/api/notifications"))
      .then(data => data.status === 'success' && setNotifications(data.notifications))
      .catch(err => console.error("Error fetching notifications", err))
  }, [])

  useEffect(() => {
    const safeFetch = (url: string) => fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const ct = res.headers.get("content-type")
      if (!ct || !ct.includes("application/json")) throw new Error("Resposta não é JSON")
      return res.json()
    })

    fetchTodos()
    fetchNotifications()

    safeFetch(getApiUrl("/api/analytics/custom-layout"))
      .then(result => result.status === 'success' && setCustomLayout(result.layout))
      .catch(err => console.error("Error fetching custom layout", err))

    const channel = supabase.channel('dashboard_updates')
    channel
      .on('broadcast', { event: 'custom_layout' }, (payload) => setCustomLayout(payload.payload.layout || null))
      .on('broadcast', { event: 'todo_update' }, () => fetchTodos())
      .on('broadcast', { event: 'new_notification' }, () => fetchNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchTodos, fetchNotifications])

  return (
    <DashboardContext.Provider value={{
      isDemo, setIsDemo,
      adsSummary, customLayout, todos, notifications,
      fetchTodos, fetchNotifications,
      isRecordingVoice, isReadyToSpeak, isSpeaking, sessionId, toggleVoiceRecording, sendTextToVoice,
      showHotkeys, setShowHotkeys,
      showNotifications, setShowNotifications,
      isNewNotification, setIsNewNotification,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider")
  return ctx
}
