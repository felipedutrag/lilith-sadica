import { NextRequest, NextResponse } from 'next/server';
import { AppStateService } from '@/modules/system/services/app-state-service';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const chart = await AppStateService.getAnalyticsConfig('custom_chart');
    return NextResponse.json({ status: 'success', chart });
  } catch (error: any) {
    logger.error({ error }, '[API Custom Chart] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
