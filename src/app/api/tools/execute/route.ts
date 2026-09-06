import { NextRequest, NextResponse } from 'next/server';
import { actionRegistry } from '@/modules/tools';

export async function POST(req: NextRequest) {
  try {
    const { name, args } = await req.json();

    const tool = actionRegistry[name];
    if (!tool) {
      return NextResponse.json({ status: 'error', message: `Ferramenta '${name}' não encontrada.` }, { status: 404 });
    }

    // Mock context for tool execution outside of Telegram
    const mockCtx = {
      reply: async (text: string) => console.log('[Tool Execute] Reply:', text),
      // Add other necessary context methods if tools use them
    };

    const result = await tool(args, mockCtx as any);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing tool:', error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
