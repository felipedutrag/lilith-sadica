import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/modules/ads/services/ads-service';

export async function GET() {
  try {
    const campaigns = await googleAdsService.listCampaigns();
    return NextResponse.json({ status: 'success', campaigns });
  } catch (error: any) {
    console.error('[API Campaigns List Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
