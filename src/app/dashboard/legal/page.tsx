"use client"

import { getApiUrl } from "@/lib/utils"
import LegalDashboard from "@/components/dashboard/LegalDashboard"

export default function LegalPage() {
  return <LegalDashboard getApiUrl={getApiUrl} />
}
