import { NextRequest, NextResponse } from 'next/server';
import { TodoService } from '@/modules/system/services/todo-service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const todos = await TodoService.getTodos();
    return NextResponse.json({ status: 'success', todos });
  } catch (error: any) {
    logger.error({ error }, '[API Todos] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const saved = await TodoService.saveTodo(body);
    if (saved) {
      await TodoService.addNotification(`Ritual/Todo criado: "${saved.title}"`, 'success');
      return NextResponse.json({ status: 'success', todo: saved });
    }
    return NextResponse.json({ status: 'error', message: 'Failed to save todo' }, { status: 500 });
  } catch (error: any) {
    logger.error({ error }, '[API Todos] POST error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
