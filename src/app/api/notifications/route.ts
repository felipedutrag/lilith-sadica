import { NextRequest, NextResponse } from 'next/server';
import { TodoService } from '@/modules/system/services/todo-service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const notifications = await TodoService.getNotifications();
    return NextResponse.json({ status: 'success', notifications });
  } catch (error: any) {
    logger.error({ error }, '[API Notifications] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    if (action === 'read') {
      await TodoService.markNotificationsAsRead();
      return NextResponse.json({ status: 'success' });
    }
    return NextResponse.json({ status: 'error', error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    logger.error({ error }, '[API Notifications] POST error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
