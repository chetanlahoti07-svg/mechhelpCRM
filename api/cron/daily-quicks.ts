import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildDailyQuicksSummary } from '../shared/dailyQuicks/builder';
import {
  formatDailyQuicksEmailBody,
  formatDailyQuicksEmailHtml,
  formatDailyQuicksEmailSubject,
} from '../shared/dailyQuicks/emailFormatter';
import { toISTDateString } from '../shared/dailyQuicks/istDate';
import {
  fetchLeadsForSummary,
  getDailySummaryByDate,
  markEmailSent,
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

    // FIX: Only skip if the email was actually delivered (email_sent = true).
    // Previously we skipped as soon as a DB record existed, which meant a
    // failed email delivery would permanently silence that day's email —
    // the record was written before the send, so every subsequent cron run
    // would see the record and bail out without retrying.
    if (!isForce) {
      const existing = await getDailySummaryByDate(todayIST);
      if (existing?.email_sent) {
        console.log(`Daily Quicks already sent for ${todayIST}. Skipping.`);
        return res.status(200).json({
          ok: true,
          alreadyExecuted: true,
          date: todayIST,
          message: 'Summary already generated and email sent for today.',
        });
      }

      if (existing && !existing.email_sent) {
        // Record exists but previous email delivery failed — log and retry.
        console.warn(
          `Daily Quicks record for ${todayIST} exists but email_sent=false. Retrying email delivery.`
        );
      }
    }

    // Build summary and persist it first (email_sent defaults to false).
    const leads = await fetchLeadsForSummary();
    const summary = buildDailyQuicksSummary(leads);
    const stored = await upsertDailySummary(summary);

    // Compose email.
    const subject = formatDailyQuicksEmailSubject(summary);
    const text = formatDailyQuicksEmailBody(summary);
    const html = formatDailyQuicksEmailHtml(summary);

    // FIX: Send email BEFORE marking it as done. If the send fails, the
    // DB record stays with email_sent=false so the next cron run retries.
    await sendDailyQuicksEmail(subject, text, html);

    // Only mark sent after confirmed delivery.
    await markEmailSent(todayIST);

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
