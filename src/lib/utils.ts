import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl(path: string) {
  if (typeof window !== "undefined") {
    return path;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}${path}`;
}

export function getWsUrl(path: string) {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${path}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const wsUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/^http/, 'ws');
    return `${wsUrl}${path}`;
  }
  const port = process.env.PORT || 3000;
  return `ws://localhost:${port}${path}`;
}
