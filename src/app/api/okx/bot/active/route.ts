import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get('isDemo') === 'true';

    const { client } = await getOkxClient(isDemo);

    // Buscamos bots de grade (SPOT) e grade de contrato (FUTURES/SWAP)
    const [spotGridRes, contractGridRes] = await Promise.allSettled([
      client.privateGet('/api/v5/grid/trading/orders-algo-active', { algoOrdType: 'grid' }),
      client.privateGet('/api/v5/grid/trading/orders-algo-active', { algoOrdType: 'contract_grid' })
    ]);

    const spotBots = spotGridRes.status === 'fulfilled' ? (spotGridRes.value.data || []) : [];
    const contractBots = contractGridRes.status === 'fulfilled' ? (contractGridRes.value.data || []) : [];
    
    // Unificar e mapear para o formato que o dashboard espera
    const allBots = [...spotBots, ...contractBots].map(b => ({
      ...b,
      displayPnl: b.totalPnl || b.pnl || '0',
      displayFills: b.fills || '0',
      sz: b.investment || b.sz || '0'
    }));

    return NextResponse.json({ status: 'success', bots: allBots });
  } catch (error: any) {
    console.error('[API OKX Active Bots Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
