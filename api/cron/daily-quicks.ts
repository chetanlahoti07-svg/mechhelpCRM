import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildDailyQuicksSummary } from '../../shared/dailyQuicks/builder';
import {
  formatDailyQuicksEmailBody,
  formatDailyQuicksEmailSubject,
} from '../../shared/dailyQuicks/emailFormatter';
import { toISTDateString } from '../../shared/dailyQuicks/istDate';
import {
  fetchLeadsForSummary,
  getDailySummaryByDate,
  upsertDailySummary,
} from '../lib/supabaseAdmin';
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
    const todayIST = toISTDateString(new Date());
    const isForce = req.query.force === 'true';

    // Ensure summary is generated and email is sent only ONCE per day (unless force=true)
    if (!isForce) {
      const existing = await getDailySummaryByDate(todayIST);
      if (existing) {
        console.log(`Daily Quicks summary already generated and sent for ${todayIST}`);
        return res.status(200).json({
          ok: true,
          alreadyExecuted: true,
          date: todayIST,
          message: 'Summary already generated and email sent for today.',
        });
      }
    }

    const leads = await fetchLeadsForSummary();
    const summary = buildDailyQuicksSummary(leads);
    const stored = await upsertDailySummary(summary);

    const subject = formatDailyQuicksEmailSubject(summary);
    const body = formatDailyQuicksEmailBody(summary);

    await sendDailyQuicksEmail(subject, body);
    console.log(`Successfully sent Daily Quicks email for ${todayIST} to ${process.env.ADMIN_NOTIFICATION_EMAIL}`);

    return res.status(200).json({
      ok: true,
      alreadyExecuted: false,
      date: summary.date,
      generatedAt: stored.generated_at,
      stats: summary.stats,
    });
  } catch (error) {
    console.error('Daily Quicks cron failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      ok: false,
      error: message,
    });
  }
}
