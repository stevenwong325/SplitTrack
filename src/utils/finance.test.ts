import { describe, expect, it } from 'vitest';
import type { Participant, Transaction } from '../types';
import {
  buildSettlementTransaction,
  calculateSettlements,
  calculateUserStats,
  findDebtBetween,
  getSettlementParties,
  simulateSettlement,
  summarizeSettlementPayments,
} from './finance';
import type { SettlementDraft } from './finance';

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

describe('partial settlements and transfers', () => {
  it('accumulates two partial repayments into the remaining balance', () => {
    const bill = groupExpense({ splits: [{ participantId: 'friend', amount: 100 }] });

    const debts = calculateSettlements([
      bill,
      settlement('friend', 'me', 25),
      settlement('friend', 'me', 40),
    ], participants);

    expect(debts).toEqual([{ from: 'friend', to: 'me', amount: 35 }]);
  });

  it('flips the balance when a member overpays', () => {
    const bill = groupExpense({ splits: [{ participantId: 'friend', amount: 100 }] });

    const debts = calculateSettlements([bill, settlement('friend', 'me', 130)], participants);

    expect(debts).toEqual([{ from: 'me', to: 'friend', amount: 30 }]);
  });

  it('summarizes how much each directed pair has already repaid', () => {
    const summary = summarizeSettlementPayments([
      settlement('friend', 'me', 20),
      settlement('friend', 'me', 30),
      { ...settlement('me', 'friend', 5), id: 'reverse' },
      { ...groupExpense(), id: 'ignored-expense' },
    ]);

    expect(summary['friend->me']).toMatchObject({ from: 'friend', to: 'me', amount: 50, count: 2 });
    expect(summary['me->friend']).toMatchObject({ from: 'me', to: 'friend', amount: 5, count: 1 });
    expect(Object.keys(summary)).toHaveLength(2);
  });

  it('builds a partial settlement record that keeps the ledger consistent', () => {
    const draft: SettlementDraft = {
      from: 'friend',
      to: 'me',
      amount: 30,
      currency: 'HKD',
      rate: 1,
      date: '2026-08-20',
      note: 'rest of the dinner',
    };
    const transaction = buildSettlementTransaction(draft, participants);

    expect(transaction).toMatchObject({
      type: 'settlement',
      paidBy: 'friend',
      settlementFrom: 'friend',
      settlementTo: 'me',
      amount: 30,
      note: 'rest of the dinner',
      splits: [{ participantId: 'me', amount: 30 }],
    });
    // The legacy-settlement migrator must never touch the new records.
    expect(getSettlementParties({ ...transaction, id: 'x' })).toEqual({ from: 'friend', to: 'me' });
  });

  it('previews the remaining debts of a partial payment without mutating input', () => {
    const transactions = [groupExpense({ splits: [{ participantId: 'friend', amount: 100 }] })];

    const preview = simulateSettlement(transactions, participants, {
      from: 'friend',
      to: 'me',
      amount: 40,
      currency: 'HKD',
      rate: 1,
      date: '2026-08-20',
    });

    expect(preview.debts).toEqual([{ from: 'friend', to: 'me', amount: 60 }]);
    expect(transactions).toHaveLength(1);
    expect(calculateSettlements(transactions, participants)).toEqual([
      { from: 'friend', to: 'me', amount: 100 },
    ]);
  });

  it('previews a full settlement as an empty debt list', () => {
    const transactions = [groupExpense({ splits: [{ participantId: 'friend', amount: 60 }] })];

    const preview = simulateSettlement(transactions, participants, {
      from: 'friend',
      to: 'me',
      amount: 60,
      currency: 'HKD',
      rate: 1,
      date: '2026-08-20',
    });

    expect(preview.debts).toEqual([]);
  });

  it('supports transfers recorded in a foreign currency', () => {
    const bill = groupExpense({ amount: 1000, currency: 'JPY', rate: 0.05, splits: [{ participantId: 'friend', amount: 1000 }] });

    const preview = simulateSettlement([bill], participants, {
      from: 'friend',
      to: 'me',
      amount: 400,
      currency: 'JPY',
      rate: 0.05,
      date: '2026-08-20',
    });

    expect(preview.debts).toEqual([{ from: 'friend', to: 'me', amount: 30 }]);
  });

  it('finds the outstanding debt between two members', () => {
    const debts = [{ from: 'friend', to: 'me', amount: 60 }];
    expect(findDebtBetween(debts, 'friend', 'me')).toEqual(debts[0]);
    expect(findDebtBetween(debts, 'me', 'friend')).toBeUndefined();
  });
});
