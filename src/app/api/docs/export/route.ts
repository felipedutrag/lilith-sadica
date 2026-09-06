import { NextRequest, NextResponse } from 'next/server';
import { exportToGoogleDocs } from '@/modules/system/services/google-docs-service';

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ status: 'error', error: 'title e content são obrigatórios.' }, { status: 400 });
    }
    const result = await exportToGoogleDocs(title, content);
    return NextResponse.json({ status: 'success', ...result });
  } catch (error: any) {
    console.error('[API Docs Export Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
