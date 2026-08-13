import { describe, expect, it } from 'vitest';
import type { Participant, Transaction } from '../types';
import { calculateSettlements, calculateUserStats } from './finance';

const participants: Participant[] = [
  { id: 'me', name: 'You' },
  { id: 'friend', name: 'Friend' },
];

function groupExpense(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'bill',
    description: 'Shared bill',
    amount: 100,
    currency: 'HKD',
    rate: 1,
    date: '2026-08-01',
    category: 'Food',
    type: 'expense',
    paidBy: 'me',
    isPersonal: false,
    splitMode: 'custom',
    splits: [
      { participantId: 'me', amount: 40 },
      { participantId: 'friend', amount: 60 },
    ],
    ...overrides,
  };
}

function settlement(from: string, to: string, amount: number): Transaction {
  return {
    id: `settlement-${from}-${to}`,
    description: '🤝 Settlement payment',
    amount,
    currency: 'HKD',
    rate: 1,
    date: '2026-08-13',
    category: 'Others',
    type: 'settlement',
    paidBy: from,
    isPersonal: false,
    splitMode: 'custom',
    splits: [{ participantId: to, amount }],
    settlementFrom: from,
    settlementTo: to,
  };
}

describe('settlement accounting', () => {
  it('clears money owed to the current user without adding an expense', () => {
    const bill = groupExpense();
    expect(calculateSettlements([bill], participants)).toEqual([
      { from: 'friend', to: 'me', amount: 60 },
    ]);

    const transactions = [bill, settlement('friend', 'me', 60)];
    const debts = calculateSettlements(transactions, participants);
    const stats = calculateUserStats(transactions, 'me', debts);

    expect(debts).toEqual([]);
    expect(stats.totalPersonalExpenses).toBe(40);
    expect(stats.categoryBreakdown).toEqual({ Food: 40 });
  });

  it('clears money the current user owes without changing their real bill share', () => {
    const bill = groupExpense({
      paidBy: 'friend',
      splits: [
        { participantId: 'me', amount: 60 },
        { participantId: 'friend', amount: 40 },
      ],
    });
    const transactions = [bill, settlement('me', 'friend', 60)];
    const debts = calculateSettlements(transactions, participants);
    const stats = calculateUserStats(transactions, 'me', debts);

    expect(debts).toEqual([]);
    expect(stats.totalPersonalExpenses).toBe(60);
  });

  it('keeps the correct balance after a partial repayment', () => {
    const bill = groupExpense({
      splits: [{ participantId: 'friend', amount: 100 }],
    });

    expect(calculateSettlements(
      [bill, settlement('friend', 'me', 60)],
      participants,
    )).toEqual([{ from: 'friend', to: 'me', amount: 40 }]);
  });

  it('combines a foreign-currency bill with a base-currency repayment', () => {
    const bill = groupExpense({
      amount: 1000,
      currency: 'JPY',
      rate: 0.05,
      splits: [{ participantId: 'friend', amount: 1000 }],
    });

    expect(calculateSettlements(
      [bill, settlement('friend', 'me', 20)],
      participants,
    )).toEqual([{ from: 'friend', to: 'me', amount: 30 }]);
  });
});
