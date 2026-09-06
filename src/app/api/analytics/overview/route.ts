import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculatePearsonCorrelation } from '@/lib/stats';

function isGoogleAds(s: any): boolean {
  const lp = (s.landing_page || '').toLowerCase();
  const src = (s.utm_source || '').toLowerCase();
  const ref = (s.referrer || '').toLowerCase();

  return (
    src.includes('google') ||
    lp.includes('gclid=') ||
    lp.includes('gbraid=') ||
    lp.includes('wbraid=') ||
    lp.includes('gad_source=') ||
    lp.includes('gad_campaignid=') ||
    ref.includes('google.com') ||
    ref.includes('googleads.g.doubleclick.net')
  );
}

function detectOS(s: any): 'ios' | 'android' | 'desktop' | 'other' {
  const lp = (s.landing_page || '').toLowerCase();
  const dt = (s.device_type || '').toLowerCase();

  if (lp.includes('gbraid=') || dt.includes('iphone') || dt.includes('ipad') || dt.includes('ios') || dt.includes('macintosh')) {
    return 'ios';
  }
  if (lp.includes('wbraid=') || dt.includes('android') || (dt.includes('mobile') && !dt.includes('iphone'))) {
    return 'android';
  }
  if (dt.includes('desktop') || dt.includes('windows')) {
    return 'desktop';
  }
  return 'other';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sourceParam = searchParams.get('source');
    const osParam = searchParams.get('os');
    const daysParam = searchParams.get('days');

    let since: string;
    let until: string | undefined = undefined;
    let days = 7;

    if (startDate) {
      since = `${startDate}T00:00:00.000Z`;
      const startMs = new Date(startDate).getTime();
      const endMs = endDate ? new Date(endDate).getTime() : Date.now();
      days = Math.max(1, Math.round((endMs - startMs) / 86400000));
      if (endDate) {
        until = `${endDate}T23:59:59.999Z`;
      }
    } else {
      days = daysParam ? parseInt(daysParam, 10) : 7;
      since = new Date(Date.now() - days * 86400000).toISOString();
    }

    // Buscar todas as sessões no período
    let querySessions = supabase
      .from('site_sessions')
      .select('*')
      .gte('started_at', since);

    if (until) {
      querySessions = querySessions.lte('started_at', until);
    }
    const { data: sessionsData, error: sessionsError } = await querySessions;

    if (sessionsError) throw sessionsError;

    // Buscar todos os eventos no período
    let queryEvents = supabase
      .from('site_events')
      .select('*')
      .gte('created_at', since);

    if (until) {
      queryEvents = queryEvents.lte('created_at', until);
    }
    const { data: eventsData, error: eventsError } = await queryEvents;

    if (eventsError) throw eventsError;

    let sessions = sessionsData || [];
    let events = eventsData || [];

    // Filtragem por Google Ads
    if (sourceParam === 'google') {
      sessions = sessions.filter(s => isGoogleAds(s));
      const sessionIds = sessions.map(s => s.session_id);
      events = events.filter(e => sessionIds.includes(e.session_id));
    }

    // Filtragem por OS (iOS / Android)
    if (osParam) {
      const targetOs = String(osParam).toLowerCase();
      sessions = sessions.filter(s => detectOS(s) === targetOs);
      const sessionIds = sessions.map(s => s.session_id);
      events = events.filter(e => sessionIds.includes(e.session_id));
    }

    const totalSessions = sessions.length;
    const uniqueUsers = new Set(sessions.map(s => s.session_id) || []).size;
    const pageViews = events.filter(e => e.event_name === 'page_view') || [];
    const totalPageViews = pageViews.length;

    // Calcular duração média da sessão
    const sessionTimestamps: Record<string, { first: number, last: number }> = {};
    events.forEach(e => {
      const ts = new Date(e.created_at).getTime();
      if (!sessionTimestamps[e.session_id]) {
        sessionTimestamps[e.session_id] = { first: ts, last: ts };
      } else {
        if (ts < sessionTimestamps[e.session_id].first) sessionTimestamps[e.session_id].first = ts;
        if (ts > sessionTimestamps[e.session_id].last) sessionTimestamps[e.session_id].last = ts;
      }
    });

    const sessionDurations = Object.values(sessionTimestamps)
      .map(t => t.last - t.first)
      .filter(d => d >= 0);

    const activeSessionDurations = sessionDurations.filter(d => d > 0);
    const avgSessionDurationMs = activeSessionDurations.length > 0
      ? activeSessionDurations.reduce((a, b) => a + b, 0) / activeSessionDurations.length
      : 0;

    // Bounce Rate
    const interactionEvents = ['ai_prompt_submitted', 'checkout_triggered', 'checkout_paid', 'scroll_depth_global'];
    let bouncedSessions = 0;
    sessions.forEach(s => {
      const sid = s.session_id;
      const duration = (sessionTimestamps[sid]?.last - sessionTimestamps[sid]?.first) || 0;
      const sessionEvents = events.filter(e => e.session_id === sid);
      const hasInteraction = sessionEvents.some(e => interactionEvents.includes(e.event_name));
      if (duration < 10000 && !hasInteraction) bouncedSessions++;
    });

    const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

    // Distribuição por dispositivo
    const devices: Record<string, number> = {};
    sessions?.forEach(s => {
      const os = detectOS(s);
      devices[os] = (devices[os] || 0) + 1;
    });

    // Distribuição por origens
    const sources: Record<string, number> = {};
    sessions?.forEach(s => {
      const src = s.utm_source || '(direto)';
      sources[src] = (sources[src] || 0) + 1;
    });

    // Páginas mais visitadas
    const pages: Record<string, number> = {};
    pageViews.forEach(pv => {
      const pathName = pv.page ? pv.page.split('?')[0] : '/';
      pages[pathName] = (pages[pathName] || 0) + 1;
    });
    const topPages = Object.entries(pages)
      .map(([name, views]) => ({ name, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Visualizações diárias
    const dailyViews: Record<string, number> = {};
    pageViews.forEach(pv => {
      if (pv.created_at) {
        const dateStr = pv.created_at.split('T')[0];
        dailyViews[dateStr] = (dailyViews[dateStr] || 0) + 1;
      }
    });
    const timeSeries = Object.entries(dailyViews)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Scientific Analysis
    const dailySessions: Record<string, number> = {};
    const dailyConvs: Record<string, number> = {};
    
    timeSeries.forEach(ts => {
      dailySessions[ts.date] = 0;
      dailyConvs[ts.date] = 0;
    });

    sessions.forEach(s => {
      if (s.started_at) {
        const dateStr = s.started_at.split('T')[0];
        if (dateStr in dailySessions) dailySessions[dateStr] = (dailySessions[dateStr] || 0) + 1;
      }
    });

    const conversionEventNames = ['cta_clicked', 'ai_prompt_submitted', 'checkout_triggered', 'checkout_paid'];
    const conversionEvents = events.filter(e => conversionEventNames.includes(e.event_name));
    conversionEvents.forEach(e => {
      if (e.created_at) {
        const dateStr = e.created_at.split('T')[0];
        if (dateStr in dailyConvs) dailyConvs[dateStr] = (dailyConvs[dateStr] || 0) + 1;
      }
    });

    const sessionCounts = timeSeries.map(ts => dailySessions[ts.date] || 0);
    const convCounts = timeSeries.map(ts => dailyConvs[ts.date] || 0);
    const trafficConversionCorrelation = calculatePearsonCorrelation(sessionCounts, convCounts);

    return NextResponse.json({
      status: 'success',
      metrics: {
        totalSessions,
        uniqueUsers,
        totalPageViews,
        avgSessionDurationSec: Math.floor(avgSessionDurationMs / 1000),
        bounceRate: Math.round(bounceRate * 10) / 10
      },
      devices,
      sources,
      topPages,
      timeSeries,
      scientificAnalysis: {
        trafficConversionCorrelation
      }
    });
  } catch (error: any) {
    console.error('[API Analytics Overview Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
