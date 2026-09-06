import { NextRequest, NextResponse } from 'next/server';
import { AppStateService } from '@/modules/system/services/app-state-service';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();
    await AppStateService.setState('activeGoogleDocId', documentId);
    logger.info({ documentId }, '[API Docs Active] Documento ativo definido.');
    return NextResponse.json({ status: 'success', activeGoogleDocId: documentId });
  } catch (error: any) {
    logger.error({ error }, '[API Docs Active] POST error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const activeGoogleDocId = await AppStateService.getState<string>('activeGoogleDocId');
    return NextResponse.json({ status: 'success', activeGoogleDocId });
  } catch (error: any) {
    logger.error({ error }, '[API Docs Active] GET error');
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
