import path from 'path';

export const GEMINI_CHAT_MODEL = 'gemini-2.0-flash-exp';
export const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp'; // Same model usually supports images in v1beta
export const TELEGRAF_HANDLER_TIMEOUT = 120000; // 2 minutes
export const MAX_TOOL_LOOPS = 10;
export const MAX_HISTORY_LENGTH = 15;

export const MAX_SUB_AGENT_RETRIES = 3;
export const SUB_AGENT_BACKOFF_BASE_MS = 2000;
export const SUB_AGENT_SESSION_TTL_MS = 30 * 60 * 1000; // 30 min

export const TERMINAL_OUTPUT_LIMIT = 5000;
export const TERMINAL_EXEC_TIMEOUT = 30000; // 30s
export const HISTORY_SEARCH_MAX_RESULTS = 10;

export const VAULT_ROOT = process.env.VAULT_ROOT || path.join(/*turbopackIgnore: true*/ process.cwd(), 'workspace');




