import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, Info } from 'lucide-react';
import type { Participant, Currency, Transaction, Category, SplitMode, TransactionType, SplitShare } from '../types';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[];
  currencies: Currency[];
  baseCurrencyCode: string;
  currentUserId: string;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  editingTransaction?: Transaction | null;
  onUpdate?: (transaction: Transaction) => void;
}

const CATEGORIES: Category[] = ['Food', 'Transport', 'Lodging', 'Entertainment', 'Shopping', 'Others'];

export default function AddTransactionModal({
  isOpen,
  onClose,
  participants,
  currencies,
  baseCurrencyCode,
  currentUserId,
  onAdd,
  editingTransaction,
  onUpdate,
}: AddTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode);
  const [rateStr, setRateStr] = useState('1');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<Category>('Food');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [isPersonal, setIsPersonal] = useState(true);
  const [splitMode, setSplitMode] = useState<SplitMode>('equally');

  // Participants involved in the split (ID list)
  const [selectedSplitters, setSelectedSplitters] = useState<string[]>([]);
  // Custom split amounts per participant ID
  const [customAmounts, setCustomAmounts] = useState<{ [id: string]: string }>({});

  const selectedCurrency = useMemo(() => {
    return currencies.find(c => c.code === currencyCode) || currencies[0];
  }, [currencies, currencyCode]);

  // Load editing transaction if provided
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmountStr(editingTransaction.amount.toString());
      setCurrencyCode(editingTransaction.currency);
      setRateStr(editingTransaction.rate.toString());
      setDate(editingTransaction.date);
      setCategory(editingTransaction.category);
      setPaidBy(editingTransaction.paidBy);
      setIsPersonal(editingTransaction.isPersonal);
      setSplitMode(editingTransaction.splitMode);

      if (!editingTransaction.isPersonal) {
        setSelectedSplitters(editingTransaction.splits.map(s => s.participantId));
        const customs: { [id: string]: string } = {};
        editingTransaction.splits.forEach(s => {
          customs[s.participantId] = s.amount.toString();
        });
        setCustomAmounts(customs);
      }
    } else {
      // Reset to defaults
      setType('expense');
      setDescription('');
      setAmountStr('');
      setCurrencyCode(baseCurrencyCode);
      setRateStr('1');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('Food');
      setPaidBy(currentUserId);
      setIsPersonal(true);
      setSplitMode('equally');
      setSelectedSplitters(participants.map(p => p.id));
      setCustomAmounts({});
    }
  }, [editingTransaction, isOpen, baseCurrencyCode, currentUserId, participants]);

  // Sync exchange rate when currency changes
  useEffect(() => {
    if (!editingTransaction) {
      setRateStr(selectedCurrency.rate.toString());
    }
  }, [currencyCode, selectedCurrency, editingTransaction]);

  // Handle default category when type changes
  useEffect(() => {
    if (type === 'income') {
      setCategory('Income');
      setIsPersonal(true); // Income is personal
    } else {
      if (category === 'Income') {
        setCategory('Food');
      }
    }
  }, [type]);

  // Default to splitting among all participants if we toggle "isPersonal" to false
  useEffect(() => {
    if (!isPersonal && selectedSplitters.length === 0) {
      setSelectedSplitters(participants.map(p => p.id));
    }
  }, [isPersonal, participants, selectedSplitters]);

  const amount = parseFloat(amountStr) || 0;
  const rate = parseFloat(rateStr) || 1;

  // Compute equally split amounts (with exact decimal remainder handling)
  const equalSplits = useMemo(() => {
    if (isPersonal || type !== 'expense' || splitMode !== 'equally' || selectedSplitters.length === 0 || amount <= 0) {
      return {};
    }

    const n = selectedSplitters.length;
    // Divide total cents by n to avoid float rounding errors
    const totalCents = Math.round(amount * 100);
    const baseCents = Math.floor(totalCents / n);
    const remainderCents = totalCents % n;

    const shares: { [id: string]: number } = {};
    selectedSplitters.forEach((id, index) => {
      // Add 1 cent remainder to the last person (or distributed)
      // Standard: Add the remainder to the last person
      const shareCents = baseCents + (index === n - 1 ? remainderCents : 0);
      shares[id] = shareCents / 100;
    });

    return shares;
  }, [isPersonal, type, splitMode, selectedSplitters, amount]);

  // Calculate remaining and total custom split sums
  const customSplitsSum = useMemo(() => {
    if (splitMode !== 'custom') return 0;
    return selectedSplitters.reduce((sum, id) => {
      const val = parseFloat(customAmounts[id]) || 0;
      return sum + val;
    }, 0);
  }, [splitMode, selectedSplitters, customAmounts]);

  const customRemaining = useMemo(() => {
    return Math.max(0, Number((amount - customSplitsSum).toFixed(2)));
  }, [amount, customSplitsSum]);

  // Validators
  const isValid = useMemo(() => {
    if (amount <= 0) return false;
    if (rate <= 0) return false;

    if (type === 'expense' && !isPersonal) {
      if (selectedSplitters.length === 0) return false;
      if (splitMode === 'custom') {
        // Must match total exactly (handling potential JS float issues)
        return Math.abs(customSplitsSum - amount) < 0.01;
      }
    }
    return true;
  }, [amount, rate, type, isPersonal, selectedSplitters, splitMode, customSplitsSum]);

  const toggleSplitter = (id: string) => {
    setSelectedSplitters(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(item => item !== id);
        // Clear custom amount if unselected
        const updatedCustoms = { ...customAmounts };
        delete updatedCustoms[id];
        setCustomAmounts(updatedCustoms);
        return next;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleCustomAmountChange = (id: string, value: string) => {
    // Basic number format validation
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmounts(prev => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleAutoDistributeCustomRemaining = () => {
    if (selectedSplitters.length === 0 || amount <= 0) return;
    
    // Distribute remaining evenly among selected splitters
    const currentSum = selectedSplitters.reduce((sum, id) => {
      const val = parseFloat(customAmounts[id]) || 0;
      return sum + val;
    }, 0);
    const rem = amount - currentSum;
    if (rem <= 0) return;

    // Filter selected splitters whose custom amount is 0
    let targetSplitters = selectedSplitters.filter(id => {
      const val = parseFloat(customAmounts[id]) || 0;
      return val === 0;
    });

    // If no selected splitters have custom amount == 0, fallback to all selected splitters
    if (targetSplitters.length === 0) {
      targetSplitters = selectedSplitters;
    }

    const n = targetSplitters.length;
    const share = Number((rem / n).toFixed(2));
    
    const nextCustoms = { ...customAmounts };
    targetSplitters.forEach((id, idx) => {
      const currentVal = parseFloat(nextCustoms[id]) || 0;
      // Add share, handle last person remainder
      const valToAdd = idx === n - 1 ? Number((rem - share * (n - 1)).toFixed(2)) : share;
      nextCustoms[id] = (currentVal + valToAdd).toFixed(2);
    });
    setCustomAmounts(nextCustoms);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    let finalSplits: SplitShare[] = [];

    if (type === 'expense' && !isPersonal) {
      if (splitMode === 'equally') {
        finalSplits = selectedSplitters.map(id => ({
          participantId: id,
          amount: equalSplits[id],
        }));
      } else {
        finalSplits = selectedSplitters.map(id => ({
          participantId: id,
          amount: parseFloat(customAmounts[id]) || 0,
        }));
      }
    }

    const transactionData = {
      description: description.trim() || category,
      amount,
      currency: currencyCode,
      rate,
      date,
      category,
      type,
      paidBy: type === 'income' ? '' : paidBy,
      isPersonal: type === 'income' ? true : isPersonal,
      splitMode: type === 'income' ? 'equally' as const : splitMode,
      splits: finalSplits,
    };

    if (editingTransaction && onUpdate) {
      onUpdate({
        ...editingTransaction,
        ...transactionData,
      });
    } else {
      onAdd(transactionData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden glass-card rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/50 bg-white/30">
          <h2 className="text-xl font-semibold text-slate-800">
            {editingTransaction ? '✏️ Edit Transaction' : '➕ Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Transaction Type Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              💰 Income
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Sushi Dinner, Taxi, Salary"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Amount and Currency Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-2.5 text-slate-400 font-medium">
                  {selectedCurrency.symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0.00"
                  value={amountStr}
                  onChange={e => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setAmountStr(e.target.value);
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <select
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-slate-700"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Exchange Rate (shown if not base currency) */}
          {currencyCode !== baseCurrencyCode && (
            <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold mb-1">Foreign Currency Exchange Rate</p>
                <div className="flex items-center gap-2 mt-1">
                  <span>1 {currencyCode} =</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rateStr}
                    onChange={e => {
                      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                        setRateStr(e.target.value);
                      }
                    }}
                    className="w-20 px-2 py-0.5 border border-amber-300 rounded bg-white font-medium text-slate-800 focus:outline-none"
                  />
                  <span>{baseCurrencyCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date and Category Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Category
              </label>
              {type === 'income' ? (
                <div className="px-4 py-2.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 font-medium text-sm">
                  💰 Income
                </div>
              ) : (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer text-slate-700"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Dual Mode Toggle (Only for Expense) */}
          {type === 'expense' && (
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Expense Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPersonal(true)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                    isPersonal
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white/40 text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span className="text-base">👤</span>
                  <span className="text-xs font-semibold">Personal Expense</span>
                  <span className="text-[10px] text-slate-400">100% self-paid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPersonal(false)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                    !isPersonal
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white/40 text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span className="text-base">👥</span>
                  <span className="text-xs font-semibold">Group Split</span>
                  <span className="text-[10px] text-slate-400">Shared among members</span>
                </button>
              </div>
            </div>
          )}

          {/* Group Split Options */}
          {type === 'expense' && !isPersonal && (
            <div className="p-4 rounded-2xl bg-white/50 border border-slate-100 space-y-4 animate-slide-up">
              
              {/* Who Paid? */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <label className="text-sm font-semibold text-slate-600">
                  Paid By:
                </label>
                <select
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700 text-sm font-medium"
                >
                  {participants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Mode Selector */}
              <div className="grid grid-cols-2 gap-4 items-center border-t border-slate-100 pt-3">
                <label className="text-sm font-semibold text-slate-600">
                  Split Mode:
                </label>
                <div className="flex p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSplitMode('equally')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                      splitMode === 'equally'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMode('custom')}
                    className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                      splitMode === 'custom'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {/* Participants Selector & Shares */}
              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Participants & Shares ({selectedSplitters.length})
                </label>
                
                <div className="space-y-2">
                  {participants.map(p => {
                    const isChecked = selectedSplitters.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isChecked
                            ? 'border-indigo-100 bg-indigo-50/20'
                            : 'border-transparent hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            id={`splitter-${p.id}`}
                            checked={isChecked}
                            onChange={() => toggleSplitter(p.id)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label
                            htmlFor={`splitter-${p.id}`}
                            className={`text-sm font-medium cursor-pointer select-none ${
                              isChecked ? 'text-slate-800 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {p.name}
                          </label>
                        </div>

                        {isChecked && (
                          <div className="flex items-center gap-1.5">
                            {splitMode === 'equally' ? (
                              <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                {selectedCurrency.symbol}
                                {(equalSplits[p.id] || 0).toFixed(2)}
                              </span>
                            ) : (
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">
                                  {selectedCurrency.symbol}
                                </span>
                                <input
                                  type="text"
                                  placeholder="0.00"
                                  value={customAmounts[p.id] || ''}
                                  onChange={e => handleCustomAmountChange(p.id, e.target.value)}
                                  className="w-24 pl-6 pr-2 py-1 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-right text-xs font-semibold text-slate-700"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Validation Warnings for Custom Split */}
                {splitMode === 'custom' && selectedSplitters.length > 0 && amount > 0 && (
                  <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Total Shares Entered:</span>
                      <span
                        className={
                          Math.abs(customSplitsSum - amount) < 0.01
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {selectedCurrency.symbol}
                        {customSplitsSum.toFixed(2)} / {selectedCurrency.symbol}
                        {amount.toFixed(2)}
                      </span>
                    </div>

                    {customRemaining > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Remaining to distribute:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-amber-500">
                            {selectedCurrency.symbol}
                            {customRemaining.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={handleAutoDistributeCustomRemaining}
                            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded font-bold transition-all border border-slate-200"
                          >
                            Auto Fill
                          </button>
                        </div>
                      </div>
                    )}

                    {Math.abs(customSplitsSum - amount) >= 0.01 && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-800 text-[11px] font-semibold animate-shake">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>The sum of custom split amounts must equal the total amount exactly.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-200/50 bg-white/30 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isValid}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-lg shadow-indigo-500/10 transition-all ${
              isValid
                ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer'
                : 'bg-slate-300 shadow-none cursor-not-allowed text-slate-400'
            }`}
          >
            {editingTransaction ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
