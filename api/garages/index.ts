import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSupabaseAdmin } from '../lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseAdmin();

  try {
    // 1. Fetch all garages
    const { data: garages, error: garagesError } = await supabase
      .from('garages')
      .select('id, name')
      .order('name', { ascending: true });

    if (garagesError) throw garagesError;

    // 2. Fetch all unsettled settlements to compute running balances
    const { data: unsettledSettlements, error: settlementsError } = await supabase
      .from('garage_settlements')
      .select('garage_id, net_amount')
      .eq('settled', false);

    if (settlementsError) throw settlementsError;

    // Map balances per garage_id
    const balancesMap = new Map<string, number>();
    (unsettledSettlements || []).forEach((row: any) => {
      const current = balancesMap.get(row.garage_id) || 0;
      balancesMap.set(row.garage_id, current + Number(row.net_amount));
    });

    const garagesWithBalances = (garages || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      balance: Math.round((balancesMap.get(g.id) || 0) * 100) / 100,
    }));

    return res.status(200).json(garagesWithBalances);
  } catch (error) {
    console.error('Fetch garages with balances failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
