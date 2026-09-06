import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function POST(req: NextRequest) {
  try {
    const { algoId, instId, algoOrdType, isDemo } = await req.json();

    const { client } = await getOkxClient(isDemo);

    // No OKX API v5, parar um robô de grade utiliza o endpoint /api/v5/grid/trading/stop-order-algo
    // O corpo espera uma lista de objetos contendo as definições de parada.
    // stopType: "1" cancela as ordens pendentes e fecha as posições (comportamento padrão seguro)
    const response = await client.privatePost('/api/v5/grid/trading/stop-order-algo', [
      {
        algoId,
        instId,
        algoOrdType,
        stopType: "1" 
      }
    ]);

    return NextResponse.json({ status: 'success', output: response });
  } catch (error: any) {
    console.error('[API OKX Stop Bot Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
