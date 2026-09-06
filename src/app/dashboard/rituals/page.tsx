"use client"

import { useDashboard } from "@/contexts/dashboard"
import { getApiUrl } from "@/lib/utils"
import RitualsDashboard from "@/components/dashboard/RitualsDashboard"

export default function RitualsPage() {
  const { todos, fetchTodos } = useDashboard()
  return <RitualsDashboard todos={todos} onRefresh={fetchTodos} getApiUrl={getApiUrl} />
}
