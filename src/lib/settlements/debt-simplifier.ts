export interface MemberBalanceInput {
  member_id: string;
  full_name: string;
  net_balance: number;
}

export interface SettlementSuggestion {
  from_member_id: string;
  from_member_name: string;
  to_member_id: string;
  to_member_name: string;
  amount: number;
}

/**
 * Debt simplification algorithm using greedy min-cash-flow.
 * Minimizes the total number of transactions required to settle all debts.
 */
export function calculateOptimalSettlements(balances: MemberBalanceInput[]): SettlementSuggestion[] {
  // Separate into debtors (< 0) and creditors (> 0)
  const debtors: { id: string; name: string; amount: number }[] = [];
  const creditors: { id: string; name: string; amount: number }[] = [];

  for (const b of balances) {
    const rounded = Number(b.net_balance.toFixed(2));
    if (rounded < -0.01) {
      debtors.push({ id: b.member_id, name: b.full_name, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ id: b.member_id, name: b.full_name, amount: rounded });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggestions: SettlementSuggestion[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledAmount = Number(Math.min(debtor.amount, creditor.amount).toFixed(2));

    if (settledAmount > 0.01) {
      suggestions.push({
        from_member_id: debtor.id,
        from_member_name: debtor.name,
        to_member_id: creditor.id,
        to_member_name: creditor.name,
        amount: settledAmount,
      });
    }

    debtor.amount = Number((debtor.amount - settledAmount).toFixed(2));
    creditor.amount = Number((creditor.amount - settledAmount).toFixed(2));

    if (debtor.amount <= 0.01) {
      dIdx++;
    }
    if (creditor.amount <= 0.01) {
      cIdx++;
    }
  }

  return suggestions;
}

