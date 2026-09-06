"use client"

import { getApiUrl } from "@/lib/utils"
import GoogleDocsDashboard from "@/components/dashboard/GoogleDocsDashboard"

export default function DocsPage() {
  return <GoogleDocsDashboard getApiUrl={getApiUrl} />
}
