export const runtime = 'nodejs';

import fs from 'fs';
import path from 'path';

import { VAULT_ROOT } from '@/lib/constants';
const encoder = new TextEncoder();

const g = globalThis as any;
if (!g.__obsidianSse) {
  g.__obsidianSse = {
    clients: new Set<ReadableStreamDefaultController>(),
    watcher: null as fs.FSWatcher | null,
    timer: null as ReturnType<typeof setTimeout> | null,
    pending: new Set<string>(),
  };
}

function flushPending() {
  const state = g.__obsidianSse;
  if (state.pending.size === 0) return;
  const paths = [...state.pending];
  state.pending.clear();
  const payload = JSON.stringify({ event: 'change', paths });
  const message = encoder.encode(`data: ${payload}\n\n`);
  for (const ctrl of state.clients) {
    try { ctrl.enqueue(message); } catch { /* ignore */ }
  }
}

function onFsEvent(eventType: string, filename: string | null) {
  if (!filename) return;
  const relativePath = filename.replace(/\\/g, '/');
  const state = g.__obsidianSse;
  state.pending.add(relativePath);
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(flushPending, 150);
}

function startWatcher() {
  const state = g.__obsidianSse;
  if (state.watcher) return;
  if (!fs.existsSync(VAULT_ROOT)) {
    fs.mkdirSync(VAULT_ROOT, { recursive: true });
  }
  try {
    state.watcher = fs.watch(VAULT_ROOT, { recursive: true }, onFsEvent);
  } catch (err) {
    console.error('[obsidian-sse] fs.watch failed:', err);
  }
}

function stopWatcher() {
  const state = g.__obsidianSse;
  if (state.watcher && state.clients.size === 0) {
    state.watcher.close();
    state.watcher = null;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    state.pending.clear();
  }
}

export async function GET(request: Request) {
  const state = g.__obsidianSse;

  const stream = new ReadableStream({
    start(controller) {
      state.clients.add(controller);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ event: 'connected', path: '/' })}\n\n`)
      );
      startWatcher();

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        state.clients.delete(controller);
        stopWatcher();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
