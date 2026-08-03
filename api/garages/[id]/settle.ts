import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../../lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const garageId = Array.isArray(id) ? id[0] : id;

  if (!garageId) {
    return res.status(400).json({ error: 'Missing garage id parameter' });
  }

  // TODO: Gate settle action to an admin role when user role distinctions are introduced.
  // Currently, profiles RLS allows authenticated users to access everything.

  const supabase = createSupabaseAdmin();

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('garage_settlements')
      .update({
        settled: true,
        settled_at: now,
      })
      .eq('garage_id', garageId)
      .eq('settled', false)
      .select('*');

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Successfully settled all entries for garage.`,
      count: data?.length || 0,
      settledEntries: data,
    });
  } catch (error) {
    console.error('Settle garage failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
