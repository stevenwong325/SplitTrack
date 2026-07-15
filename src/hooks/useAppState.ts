import { useState, useEffect, useMemo } from 'react';
import type { Participant, Currency, Transaction, AppState } from '../types';

const STORAGE_KEY = 'splittrack_state';
const CURRENT_USER_KEY = 'splittrack_current_user_id';

const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'HKD', symbol: '$', rate: 1.0, isBase: true },
  { code: 'JPY', symbol: '¥', rate: 0.051 },
  { code: 'CNY', symbol: '¥', rate: 1.08 },
  { code: 'TWD', symbol: 'NT$', rate: 0.24 },
];

const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: 'user-1', name: 'You' },
  { id: 'user-2', name: 'Alice' },
  { id: 'user-3', name: 'Bob' },
];

const INITIAL_STATE: AppState = {
  participants: DEFAULT_PARTICIPANTS,
  currencies: DEFAULT_CURRENCIES,
  transactions: [],
  baseCurrencyCode: 'HKD',
};

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure standard structure is valid
        if (parsed.participants && parsed.currencies && parsed.transactions) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse SplitTrack state', e);
    }
    return INITIAL_STATE;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) return saved;
    return state.participants[0]?.id || 'user-1';
  });

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Sync current user ID to local storage
  useEffect(() => {
    localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  }, [currentUserId]);

  // Helper actions
  const addParticipant = (name: string) => {
    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
    };
    setState(prev => ({
      ...prev,
      participants: [...prev.participants, newParticipant],
    }));
    return newParticipant;
  };

  const removeParticipant = (id: string) => {
    // Cannot delete the active user, unless another is set
    if (id === currentUserId) {
      alert('Cannot delete the active user. Please select a different user as "You" in Settings first.');
      return;
    }
    setState(prev => {
      // Remove participant from transactions where they paid, or where they split
      // Actually, we keep transactions but it's cleaner to remove split shares
      // or warn the user. For safety, filter out transactions that were paid by them,
      // or clean up split shares.
      const updatedTransactions = prev.transactions.map(t => {
        if (t.paidBy === id) {
          // If the payer is deleted, default to current user
          t = { ...t, paidBy: currentUserId };
        }
        const filteredSplits = t.splits.filter(s => s.participantId !== id);
        // If splits changed, adjust amount or mode
        return {
          ...t,
          splits: filteredSplits,
        };
      });

      return {
        ...prev,
        participants: prev.participants.filter(p => p.id !== id),
        transactions: updatedTransactions,
      };
    });
  };

  const updateParticipant = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      participants: prev.participants.map(p => p.id === id ? { ...p, name: name.trim() } : p),
    }));
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...t,
      id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setState(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions], // Newest first
    }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
    }));
  };

  const updateTransaction = (updated: Transaction) => {
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updated.id ? updated : t),
    }));
  };

  const updateCurrencyRate = (code: string, rate: number) => {
    setState(prev => ({
      ...prev,
      currencies: prev.currencies.map(c => c.code === code ? { ...c, rate } : c),
    }));
  };

  const setBaseCurrency = (code: string) => {
    const selected = state.currencies.find(c => c.code === code);
    if (!selected) return;

    setState(prev => {
      const oldRate = selected.rate; // 1 unit of selected currency = X old base currency (HKD)
      // Recalculate rates: new base currency will have rate = 1.0
      // All other currencies will be recalculated relative to the new base
      // If 1 HKD = 1 HKD, and 1 JPY = 0.051 HKD.
      // If we switch to JPY: 1 JPY = 1 JPY (rate = 1.0).
      // 1 HKD = (1 / 0.051) JPY = 19.6 JPY?
      // Since our definition is `1 unit of currency = X base currency`:
      // If JPY is new base, then:
      // 1 HKD is 19.6 JPY? No, "1 unit of currency = X base currency"
      // If base is JPY, then 1 unit of HKD = 19.6 JPY.
      // Let's make it simpler: rates are defined relative to BASE currency.
      // If we change the base currency, we can adjust rates so that:
      // new_rate_of_C = old_rate_of_C / old_rate_of_new_base
      const updatedCurrencies = prev.currencies.map(c => {
        if (c.code === code) {
          return { ...c, rate: 1.0, isBase: true };
        }
        return {
          ...c,
          rate: Number((c.rate / oldRate).toFixed(6)),
          isBase: false,
        };
      });

      // Also need to convert transaction rates!
      // Old transactions are in their original currency, but their saved `rate` is "HKD per unit currency".
      // We need to convert that rate to "New base currency per unit currency".
      // Since `new_rate = old_rate / old_rate_of_new_base`
      const updatedTransactions = prev.transactions.map(t => ({
        ...t,
        rate: Number((t.rate / oldRate).toFixed(6)),
      }));

      return {
        ...prev,
        baseCurrencyCode: code,
        currencies: updatedCurrencies,
        transactions: updatedTransactions,
      };
    });
  };

  const addCurrency = (code: string, symbol: string, rate?: number): boolean => {
    const formattedCode = code.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(formattedCode)) {
      alert('Invalid currency code. It must be exactly 3 uppercase letters (ISO 4217).');
      return false;
    }

    const isDuplicate = state.currencies.some(c => c.code.toUpperCase() === formattedCode);
    if (isDuplicate) {
      alert(`Currency code "${formattedCode}" already exists.`);
      return false;
    }

    let finalRate = rate;
    if (finalRate === undefined || finalRate <= 0) {
      finalRate = 1.0;
      alert('Initial rate is not provided or invalid. Set to 1.0 by default. You can adjust it below.');
    }

    const newCurrency: Currency = {
      code: formattedCode,
      symbol: symbol.trim() || '$',
      rate: finalRate,
      isBase: false,
    };

    setState(prev => ({
      ...prev,
      currencies: [...prev.currencies, newCurrency],
    }));
    return true;
  };

  const removeCurrency = (code: string): boolean => {
    const formattedCode = code.trim().toUpperCase();
    if (formattedCode === state.baseCurrencyCode.toUpperCase()) {
      alert('Cannot delete the active base currency.');
      return false;
    }

    const hasTransaction = state.transactions.some(t => t.currency.toUpperCase() === formattedCode);
    if (hasTransaction) {
      alert(`Cannot delete currency "${formattedCode}" because it is referenced in one or more transactions. Please delete or modify those transactions first.`);
      return false;
    }

    setState(prev => ({
      ...prev,
      currencies: prev.currencies.filter(c => c.code.toUpperCase() !== formattedCode),
    }));
    return true;
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setState(INITIAL_STATE);
      setCurrentUserId('user-1');
    }
  };

  const loadDemoData = () => {
    const demoParticipants: Participant[] = [
      { id: 'p-1', name: 'You' },
      { id: 'p-2', name: 'Alice' },
      { id: 'p-3', name: 'Bob' },
      { id: 'p-4', name: 'Charlie' },
    ];

    const demoTransactions: Transaction[] = [
      {
        id: 't-demo-1',
        description: 'Monthly Salary',
        amount: 32000,
        currency: 'HKD',
        rate: 1.0,
        date: new Date().toISOString().split('T')[0], // Today
        category: 'Income',
        type: 'income',
        paidBy: 'p-1',
        isPersonal: true,
        splitMode: 'equally',
        splits: [],
      },
      {
        id: 't-demo-2',
        description: 'Tokyo Hotel (Lodging)',
        amount: 45000,
        currency: 'JPY',
        rate: 0.051, // 1 JPY = 0.051 HKD
        date: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0], // Yesterday
        category: 'Lodging',
        type: 'expense',
        paidBy: 'p-1', // You paid
        isPersonal: false,
        splitMode: 'equally',
        splits: [
          { participantId: 'p-1', amount: 11250 },
          { participantId: 'p-2', amount: 11250 },
          { participantId: 'p-3', amount: 11250 },
          { participantId: 'p-4', amount: 11250 },
        ],
      },
      {
        id: 't-demo-3',
        description: 'Ramen Dinner',
        amount: 8500,
        currency: 'JPY',
        rate: 0.051,
        date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0], // 2 days ago
        category: 'Food',
        type: 'expense',
        paidBy: 'p-2', // Alice paid
        isPersonal: false,
        splitMode: 'equally',
        splits: [
          { participantId: 'p-1', amount: 2125 },
          { participantId: 'p-2', amount: 2125 },
          { participantId: 'p-3', amount: 2125 },
          { participantId: 'p-4', amount: 2125 },
        ],
      },
      {
        id: 't-demo-4',
        description: 'Supermarket Shopping',
        amount: 450,
        currency: 'HKD',
        rate: 1.0,
        date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0], // 3 days ago
        category: 'Shopping',
        type: 'expense',
        paidBy: 'p-3', // Bob paid
        isPersonal: false,
        splitMode: 'custom',
        splits: [
          { participantId: 'p-1', amount: 200 }, // You ate more
          { participantId: 'p-2', amount: 150 },
          { participantId: 'p-3', amount: 100 }, // Bob paid but ate less
          { participantId: 'p-4', amount: 0 },   // Charlie wasn't there
        ],
      },
      {
        id: 't-demo-5',
        description: 'Personal Taxi Ride',
        amount: 120,
        currency: 'HKD',
        rate: 1.0,
        date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0], // 4 days ago
        category: 'Transport',
        type: 'expense',
        paidBy: 'p-1',
        isPersonal: true,
        splitMode: 'equally',
        splits: [],
      },
      {
        id: 't-demo-6',
        description: 'Universal Studios Tickets',
        amount: 3200,
        currency: 'CNY',
        rate: 1.08, // 1 CNY = 1.08 HKD
        date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0], // 5 days ago
        category: 'Entertainment',
        type: 'expense',
        paidBy: 'p-1',
        isPersonal: false,
        splitMode: 'equally',
        splits: [
          { participantId: 'p-1', amount: 800 },
          { participantId: 'p-2', amount: 800 },
          { participantId: 'p-3', amount: 800 },
          { participantId: 'p-4', amount: 800 },
        ],
      },
    ];

    setState({
      participants: demoParticipants,
      currencies: DEFAULT_CURRENCIES,
      transactions: demoTransactions,
      baseCurrencyCode: 'HKD',
    });
    setCurrentUserId('p-1');
  };

  const importData = (imported: AppState) => {
    if (imported.participants && imported.currencies && imported.transactions && imported.baseCurrencyCode) {
      setState(imported);
      if (imported.participants.length > 0) {
        setCurrentUserId(imported.participants[0].id);
      }
      return true;
    }
    return false;
  };

  // Base currency object helper
  const baseCurrency = useMemo(() => {
    return state.currencies.find(c => c.code === state.baseCurrencyCode) || DEFAULT_CURRENCIES[0];
  }, [state.currencies, state.baseCurrencyCode]);

  return {
    participants: state.participants,
    currencies: state.currencies,
    transactions: state.transactions,
    baseCurrencyCode: state.baseCurrencyCode,
    baseCurrency,
    currentUserId,
    setCurrentUserId,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    updateCurrencyRate,
    setBaseCurrency,
    addCurrency,
    removeCurrency,
    clearAllData,
    loadDemoData,
    importData,
  };
}
