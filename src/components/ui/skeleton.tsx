"use client"

import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-900/80 border border-zinc-800/50", className)}
      {...props}
    />
  )
}

export { Skeleton }




