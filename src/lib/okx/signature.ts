import { createHmac } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

let clockOffset = 0;
let clockOffsetLoaded = false;

function getOffsetCachePath(): string {
  return process.env.OKX_TIME_CACHE_PATH || join(homedir(), ".okx", "time-offset.json");
}

export function loadClockOffset(): number {
  if (process.env.OKX_NO_CLOCK_OFFSET === "1") {
    return 0;
  }
  if (clockOffsetLoaded) return clockOffset;
  try {
    const raw = readFileSync(getOffsetCachePath(), "utf-8");
    const parsed = JSON.parse(raw) as { offset?: number };
    if (typeof parsed.offset === "number") {
      clockOffset = parsed.offset;
    }
  } catch {
    // ignore
  }
  clockOffsetLoaded = true;
  return clockOffset;
}

export function setClockOffset(offset: number): void {
  clockOffset = offset;
  clockOffsetLoaded = true;
  try {
    const cachePath = getOffsetCachePath();
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, JSON.stringify({ offset, updated: new Date().toISOString() }));
  } catch {
    // ignore
  }
}

export function getNow(): string {
  const offset = loadClockOffset();
  if (offset === 0) {
    return new Date().toISOString();
  }
  return new Date(Date.now() + offset).toISOString();
}

export function signOkxPayload(payload: string, secretKey: string): string {
  return createHmac("sha256", secretKey).update(payload).digest("base64");
}
