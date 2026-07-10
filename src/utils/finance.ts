import type { Transaction, Participant, Debt, Category } from '../types';

/**
 * Calculates the simplified debts (who owes whom) from a list of transactions.
 * Returns only the transactions that are group-split expenses.
 */
export function calculateSettlements(
  transactions: Transaction[],
  participants: Participant[]
): Debt[] {
  // 1. Initialize balances in Base Currency
  const balances: { [id: string]: number } = {};
  participants.forEach(p => {
    balances[p.id] = 0;
  });

  // 2. Accumulate net balances from transactions
  transactions.forEach(t => {
    if (t.type !== 'expense' || t.isPersonal) return;

    // Convert total and shares to Base Currency using transaction-specific rate
    const totalInBase = t.amount * t.rate;
    
    // Add paid amount to the payer's credit
    if (balances[t.paidBy] !== undefined) {
      balances[t.paidBy] += totalInBase;
    }

    // Subtract each participant's share from their balance
    t.splits.forEach(share => {
      const shareInBase = share.amount * t.rate;
      if (balances[share.participantId] !== undefined) {
        balances[share.participantId] -= shareInBase;
      }
    });
  });

  // 3. Separate into debtors (balance < -0.01) and creditors (balance > 0.01)
  const debtors: { id: string; balance: number }[] = [];
  const creditors: { id: string; balance: number }[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < -0.01) {
      debtors.push({ id, balance });
    } else if (balance > 0.01) {
      creditors.push({ id, balance });
    }
  });

  // Sort: creditors descending (largest first), debtors ascending (most negative first)
  debtors.sort((a, b) => a.balance - b.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const debts: Debt[] = [];

  let dIdx = 0;
  let cIdx = 0;

  // Clone to safely mutate during calculation
  const tempDebtors = debtors.map(d => ({ ...d }));
  const tempCreditors = creditors.map(c => ({ ...c }));

  while (dIdx < tempDebtors.length && cIdx < tempCreditors.length) {
    const debtor = tempDebtors[dIdx];
    const creditor = tempCreditors[cIdx];

    const oweAmount = -debtor.balance;
    const receiveAmount = creditor.balance;

    const settledAmount = Math.min(oweAmount, receiveAmount);

    if (settledAmount > 0.01) {
      debts.push({
        from: debtor.id,
        to: creditor.id,
        amount: Number(settledAmount.toFixed(2)),
      });
    }

    // Adjust balances
    debtor.balance += settledAmount;
    creditor.balance -= settledAmount;

    if (Math.abs(debtor.balance) < 0.01) {
      dIdx++;
    }
    if (Math.abs(creditor.balance) < 0.01) {
      cIdx++;
    }
  }

  return debts;
}

export interface UserStats {
  totalIncome: number;
  totalPersonalExpenses: number;
  netBalance: number;
  totalToOwe: number;
  totalToReceive: number;
  categoryBreakdown: { [key in Category]?: number };
}

/**
 * Calculates financial statistics for a specific user.
 */
export function calculateUserStats(
  transactions: Transaction[],
  currentUserId: string,
  simplifiedDebts: Debt[],
  filterMonth?: string // Format 'YYYY-MM'
): UserStats {
  let totalIncome = 0;
  let totalPersonalExpenses = 0;
  const categoryBreakdown: { [key in Category]?: number } = {};

  // Filter transactions by month if provided
  const filteredTransactions = filterMonth
    ? transactions.filter(t => t.date.startsWith(filterMonth))
    : transactions;

  filteredTransactions.forEach(t => {
    const amountInBase = t.amount * t.rate;

    if (t.type === 'income') {
      // Income is considered 100% personal
      totalIncome += amountInBase;
      categoryBreakdown['Income'] = (categoryBreakdown['Income'] || 0) + amountInBase;
    } else {
      // Expense
      if (t.isPersonal) {
        // Personal expense
        totalPersonalExpenses += amountInBase;
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amountInBase;
      } else {
        // Group split expense: find user's share
        const userShare = t.splits.find(s => s.participantId === currentUserId);
        if (userShare) {
          const userShareInBase = userShare.amount * t.rate;
          totalPersonalExpenses += userShareInBase;
          categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + userShareInBase;
        }
      }
    }
  });

  // Calculate settlement status (To Owe / To Receive) from simplified debts
  // Note: Simplified debts are net balances. We filter by the current user.
  let totalToOwe = 0;
  let totalToReceive = 0;

  simplifiedDebts.forEach(d => {
    if (d.from === currentUserId) {
      totalToOwe += d.amount;
    } else if (d.to === currentUserId) {
      totalToReceive += d.amount;
    }
  });

  return {
    totalIncome,
    totalPersonalExpenses,
    netBalance: totalIncome - totalPersonalExpenses,
    totalToOwe,
    totalToReceive,
    categoryBreakdown,
  };
}

/**
 * Generates settlement text for WhatsApp/LINE sharing
 */
export function generateSettlementText(
  debts: Debt[],
  participants: Participant[],
  baseCurrencySymbol: string
): string {
  if (debts.length === 0) {
    return '🎉 All settled up! No outstanding debts in the group.';
  }

  const getParticipantName = (id: string) => 
    participants.find(p => p.id === id)?.name || 'Unknown';

  let text = '📊 *SplitTrack Group Settlement Summary*\n\n';
  debts.forEach((d, i) => {
    const fromName = getParticipantName(d.from);
    const toName = getParticipantName(d.to);
    text += `${i + 1}. *${fromName}* owes *${toName}* ${baseCurrencySymbol}${d.amount.toFixed(2)}\n`;
  });

  text += '\nGenerated via SplitTrack app. Please settle up!';
  return text;
}
