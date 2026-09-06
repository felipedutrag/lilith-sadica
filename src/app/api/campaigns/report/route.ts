import { NextRequest, NextResponse } from 'next/server';
import { googleAdsService } from '@/modules/ads/services/ads-service';
import { supabase } from '@/lib/supabase';
import { performScientificAnalysis } from '@/lib/stats';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7', 10);
    
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const startDateStr = formatDate(start);
    const endDateStr = formatDate(today);

    const report = await googleAdsService.getPerformanceReport(startDateStr, endDateStr);
    
    // Buscar métricas acumuladas de Ads no Supabase para análise científica
    const since = startDateStr;
    const [keywordsRes, geoRes, ageRes, genderRes, incomeRes, devicesRes, campaignsRes] = await Promise.all([
      supabase.from('ads_keywords_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_geo_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_demographics_age_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_demographics_gender_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_demographics_income_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_device_metrics').select('*').gte('metric_date', since),
      supabase.from('ads_campaign_daily_metrics').select('*').gte('report_date', since)
    ]);

    const consolidatedData = {
      campaigns: campaignsRes.data || [],
      keywords: keywordsRes.data || [],
      geo: geoRes.data || [],
      demographics: {
        age: ageRes.data || [],
        gender: genderRes.data || [],
        income: incomeRes.data || []
      },
      devices: devicesRes.data || [],
      conversionActions: []
    };

    const scientificAnalysis = performScientificAnalysis(consolidatedData);
    
    return NextResponse.json({ 
      status: 'success', 
      days, 
      report,
      scientificAnalysis 
    });
  } catch (error: any) {
    console.error('[API Campaign Report Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
