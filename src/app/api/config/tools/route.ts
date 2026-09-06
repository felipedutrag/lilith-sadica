import { NextResponse } from 'next/server';
import { toolsDeclaration } from '@/modules/tools';

export async function GET() {
  return NextResponse.json({ tools: toolsDeclaration });
}
