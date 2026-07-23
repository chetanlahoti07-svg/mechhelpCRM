import { createClient } from '@supabase/supabase-js';
import type { DailyQuicksLeadInput } from '../../shared/dailyQuicks/types';

export function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and key must be configured for Daily Quicks cron');
  }

  return createClient(url, key);
}

export async function fetchLeadsForSummary(): Promise<DailyQuicksLeadInput[]> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('leads')
    .select(`
      customer_name,
      identifier,
      lead_type,
      booking_date_time,
      next_follow_up_date,
      garage_notified,
      is_vip,
      booking_history(id)
    `)
    .order('created_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    customerName: row.customer_name,
    identifier: row.identifier,
    leadType: row.lead_type,
    bookingDateTime: row.booking_date_time ?? undefined,
    nextFollowUpDate: row.next_follow_up_date,
    garageNotified: row.garage_notified,
    isVip: row.is_vip,
    bookingHistory: row.booking_history ?? [],
  }));
}

export async function upsertDailySummary(
  summary: import('../../shared/dailyQuicks/types').DailyQuicksSummary
) {
  const supabase = createSupabaseAdmin();
  const generatedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('daily_summaries')
    .upsert(
      { date: summary.date, summary, generated_at: generatedAt },
      { onConflict: 'date' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
