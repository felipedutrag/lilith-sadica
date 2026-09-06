import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get('isDemo') !== 'false';
    const { client, config } = await getOkxClient(isDemo);

    const response = await client.privateGet('/api/v5/account/positions');
    
    return NextResponse.json({
      status: 'success',
      demo: config.demo,
      positions: response.data || []
    });
  } catch (error: any) {
    console.error('[API OKX Positions Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
