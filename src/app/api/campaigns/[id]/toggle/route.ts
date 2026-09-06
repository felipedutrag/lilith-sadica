import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/modules/ads/services/ads-service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json(); // 'ENABLED' ou 'PAUSED'

    if (status !== 'ENABLED' && status !== 'PAUSED') {
      return NextResponse.json({ status: 'error', error: 'Status inválido. Use ENABLED ou PAUSED.' }, { status: 400 });
    }

    console.log(`[API Campaigns Toggle] Alterando status da campanha ${id} para ${status}...`);
    await googleAdsService.updateCampaignStatus(id, status);
    return NextResponse.json({ status: 'success', message: `Campanha atualizada para ${status}!` });
  } catch (error: any) {
    console.error('[API Campaigns Toggle Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
