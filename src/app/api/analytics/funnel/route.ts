import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const daysParam = searchParams.get('days');

    let since: string;
    let until: string | undefined = undefined;

    if (startDate) {
      since = `${startDate}T00:00:00.000Z`;
      if (endDate) {
        until = `${endDate}T23:59:59.999Z`;
      }
    } else {
      const days = daysParam ? parseInt(daysParam, 10) : 7;
      since = new Date(Date.now() - days * 86400000).toISOString();
    }

    let querySessions = supabase
      .from('site_sessions')
      .select('count', { count: 'exact', head: true })
      .gte('started_at', since);

    if (until) querySessions = querySessions.lte('started_at', until);
    const { count: totalSessions } = await querySessions;

    const eventNames = [
      'reached_editor',
      'opened_ai_panel',
      'submitted_ai_prompt',
      'triggered_checkout',
      'viewed_checkout',
      'paid'
    ];

    const funnel: Record<string, number> = { total_sessions: totalSessions || 0 };

    await Promise.all(eventNames.map(async (name) => {
      let query = supabase
        .from('site_events')
        .select('session_id', { count: 'exact', head: true })
        .eq('event_name', name)
        .gte('created_at', since);
      
      if (until) query = query.lte('created_at', until);
      
      const { count } = await query;
      funnel[name] = count || 0;
    }));

    return NextResponse.json({
      status: 'success',
      funnel
    });
  } catch (error: any) {
    console.error('[API Analytics Funnel Error]:', error);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }
}
