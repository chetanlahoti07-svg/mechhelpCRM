export interface LineItemInput {
  name: string;
  amount: number;
  splitEnabled: boolean;
  mechhelpPct: number;
  garagePct: number;
}

export interface SettlementCalculationResult {
  totalAmount: number;
  totalMechhelpEntitled: number;
  totalGarageEntitled: number;
  netAmount: number;
}

/**
 * Calculates the split amounts and net balance for a booking settlement.
 * 
 * - If paid_to is 'garage', the garage collected payment and owes MechHelp the MechHelp portion (net_amount positive).
 * - If paid_to is 'mechhelp', MechHelp collected payment and owes the garage the garage portion (net_amount negative).
 * - Split disabled items allocate 100% of the amount to the garage.
 */
export function calculateSettlement(
  lineItems: LineItemInput[],
  paidTo: 'garage' | 'mechhelp'
): SettlementCalculationResult {
  let totalAmount = 0;
  let totalMechhelpEntitled = 0;
  let totalGarageEntitled = 0;

  for (const item of lineItems) {
    const amount = Number(item.amount) || 0;
    totalAmount += amount;

    if (item.splitEnabled) {
      const mhPct = Number(item.mechhelpPct) ?? 20;
      const gPct = Number(item.garagePct) ?? 80;
      totalMechhelpEntitled += amount * (mhPct / 100);
      totalGarageEntitled += amount * (gPct / 100);
    } else {
      totalGarageEntitled += amount;
    }
  }

  let netAmount = 0;
  if (paidTo === 'garage') {
    netAmount = totalMechhelpEntitled;
  } else if (paidTo === 'mechhelp') {
    netAmount = -totalGarageEntitled;
  }

  // Round values to 2 decimal places to avoid floating point errors
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalMechhelpEntitled: Math.round(totalMechhelpEntitled * 100) / 100,
    totalGarageEntitled: Math.round(totalGarageEntitled * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
}
