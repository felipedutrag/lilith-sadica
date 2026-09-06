import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram/bot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate that the request is actually from Telegram (optional but recommended)
    // One way is to use a secret token in the URL or check the IP.
    
    await bot.handleUpdate(body);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// GET is useful for debugging or setting the webhook
export async function GET() {
  return NextResponse.json({ status: 'Webhook is active' });
}



