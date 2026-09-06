import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const instType = searchParams.get('instType') || 'SWAP';
    
    let instruments = [];
    try {
      const { client } = await getOkxClient(true);
      const response = await client.publicGet('/api/v5/public/instruments', { instType });
      instruments = response.data || [];
    } catch (error) {
      console.warn('[API OKX Instruments] Failed to use client, falling back to direct fetch:', error);
      const res = await fetch(`https://www.okx.com/api/v5/public/instruments?instType=${instType}`);
      const data = await res.json();
      instruments = data.data || [];
    }
    
    return NextResponse.json({
      status: 'success',
      instruments
    });
  } catch (error: any) {
    console.error('[API OKX Instruments Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
