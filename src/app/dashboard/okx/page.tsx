"use client"

import { useDashboard } from "@/contexts/dashboard"
import GridTradingDashboard from "@/components/dashboard/GridTradingDashboard"

export default function OkxPage() {
  const { isDemo, setIsDemo } = useDashboard()
  return <GridTradingDashboard isDemo={isDemo} onModeChange={setIsDemo} />
}
