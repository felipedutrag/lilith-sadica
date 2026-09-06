import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET() {
  return NextResponse.json({ 
    key: env.GEMINI_AUDIO_API_KEY || env.GEMINI_API_KEY || '' 
  });
}
