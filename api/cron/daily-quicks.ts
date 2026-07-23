import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildDailyQuicksSummary } from '../../shared/dailyQuicks/builder';
import {
  formatDailyQuicksEmailBody,
  formatDailyQuicksEmailSubject,
} from '../../shared/dailyQuicks/emailFormatter';
import { fetchLeadsForSummary, upsertDailySummary } from '../lib/supabaseAdmin';
import { sendDailyQuicksEmail } from '../lib/sendEmail';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const leads = await fetchLeadsForSummary();
    const summary = buildDailyQuicksSummary(leads);
    const stored = await upsertDailySummary(summary);

    const subject = formatDailyQuicksEmailSubject(summary);
    const body = formatDailyQuicksEmailBody(summary);
    await sendDailyQuicksEmail(subject, body);

    return res.status(200).json({
      ok: true,
      date: summary.date,
      generatedAt: stored.generated_at,
      stats: summary.stats,
    });
  } catch (error) {
    console.error('Daily Quicks cron failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
