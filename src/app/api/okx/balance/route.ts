import { NextRequest, NextResponse } from 'next/server';
import { getOkxClient } from '@/lib/okx/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isDemo = searchParams.get('isDemo') !== 'false';
    const { client, config } = await getOkxClient(isDemo);

    const response = await client.privateGet('/api/v5/account/balance');
    const rawBalance = response.data?.[0] || null;
    let balance = rawBalance;

    if (rawBalance) {
      const usdtDetails = rawBalance.details?.find((d: any) => d.ccy === 'USDT');
      balance = {
        ...rawBalance,
        eq: rawBalance.eq && rawBalance.eq.trim() !== '' ? rawBalance.eq : (usdtDetails?.eq || rawBalance.totalEq || '0'),
        availEq: rawBalance.availEq && rawBalance.availEq.trim() !== '' ? rawBalance.availEq : (usdtDetails?.availEq || rawBalance.totalEq || '0'),
        ordFroz: rawBalance.ordFroz && rawBalance.ordFroz.trim() !== '' ? rawBalance.ordFroz : (usdtDetails?.frozenBal || '0')
      };
    }

    return NextResponse.json({
      status: 'success',
      demo: config.demo,
      balance
    });
  } catch (error: any) {
    console.error('[API OKX Balance Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
