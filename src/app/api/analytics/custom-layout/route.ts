import { NextRequest, NextResponse } from 'next/server';
import { AppStateService } from '@/modules/system/services/app-state-service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const layout = await AppStateService.getAnalyticsConfig('custom_layout');
    return NextResponse.json({ status: 'success', layout });
  } catch (error: any) {
    logger.error({ error }, '[API Custom Layout] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
