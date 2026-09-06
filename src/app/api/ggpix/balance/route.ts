import { NextResponse } from 'next/server';
import { GGPixService } from '@/modules/payments/services/ggpix-service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const data = await GGPixService.getBalance();
    return NextResponse.json({ status: 'success', data });
  } catch (error: any) {
    logger.error({ error }, '[API GGPix Balance] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
