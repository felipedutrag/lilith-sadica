import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function GET() {
  try {
    const { client } = await getOkxClient(true); // Usar demo por padrão para screener
    const response = await client.publicGet("/api/v5/market/tickers", { instType: "SWAP" });
    
    if (response.data && response.data.length > 0) {
      const tickers = response.data.map((t: any) => ({
        instId: t.instId,
        last: parseFloat(t.last),
        volCcy24h: parseFloat(t.volCcy24h),
        open24h: parseFloat(t.open24h),
        change24h: ((parseFloat(t.last) - parseFloat(t.open24h)) / parseFloat(t.open24h)) * 100
      })).sort((a: any, b: any) => b.volCcy24h - a.volCcy24h);

      return NextResponse.json({
        status: 'success',
        tickers: tickers.slice(0, 50)
      });
    } else {
      return NextResponse.json({ status: 'error', error: 'Nenhum dado retornado da OKX' }, { status: 404 });
    }
  } catch (error: any) {
    console.error('[API OKX Screener Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
