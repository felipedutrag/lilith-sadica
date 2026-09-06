import { NextResponse } from 'next/server';
import { listGoogleDocs } from '@/modules/system/services/google-docs-service';

export async function GET() {
  try {
    const docs = await listGoogleDocs();
    return NextResponse.json({ status: 'success', docs });
  } catch (error: any) {
    console.error('[API Docs List Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
