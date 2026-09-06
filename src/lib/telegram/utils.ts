import { BotContext } from '@/types';

export function stripMarkdown(text: string): string {
  return text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~([^~]+)~/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~\[\]]/g, '');
}

export function formatForTelegram(text: string): string {
  const codeBlocks: string[] = [];
  let result = text.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/^#+\s*(.+)$/gm, '*$1*');
  result = result.replace(/^[*-]{3,}\s*$/gm, '');
  result = result.replace(/^>\s*/gm, '');
  result = result.replace(/([^\n])\n(\d+[\.\)]\s)/g, '$1\n\n$2');
  result = result.replace(/([^\n])\n([-•]\s)/g, '$1\n\n$2');
  result = result.replace(/([^\n])\n(\*[^*]+\*:)/g, '$1\n\n$2');
  result = result.replace(/(\*[^*]+\*:)\n([^\n])/g, '$1\n\n$2');
  result = result.replace(/\n{3,}/g, '\n\n');

  codeBlocks.forEach((block, i) => {
    result = result.replace(`__CODE_BLOCK_${i}__`, block);
  });

  return result.trim();
}

function splitMessage(text: string, maxLength: number = 4000): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitIndex = remaining.lastIndexOf('\n\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength * 0.3) splitIndex = maxLength;
    chunks.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }
  return chunks;
}

export async function safeReply(ctx: BotContext, text: string, extra: Record<string, any> = {}) {
  if (!text) return;
  const formatted = formatForTelegram(text);
  const chunks = splitMessage(formatted);
  for (const chunk of chunks) {
    try {
      await ctx.reply(chunk, { parse_mode: 'Markdown', ...extra });
    } catch (err: any) {
      try {
        await ctx.reply(stripMarkdown(chunk), extra);
      } catch (innerErr: any) {}
    }
  }
}



