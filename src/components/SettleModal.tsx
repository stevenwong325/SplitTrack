import { useMemo, useState } from 'react';
import { X, ArrowRight, AlertCircle, Info, ChevronDown, Wallet } from 'lucide-react';
import type { Currency, Participant, Transaction } from '../types';
import {
  calculateSettlements,
  findDebtBetween,
  simulateSettlement,
} from '../utils/finance';
import type { SettlementDraft } from '../utils/finance';

export interface SettlePreset {
  from: string;
  to: string;
  /** 'full' prefills the outstanding amount, 'partial' starts from an empty field. */
  mode: 'full' | 'partial';
}

interface SettleModalProps {
  onClose: () => void;
  participants: Participant[];
  transactions: Transaction[];
  currencies: Currency[];
  baseCurrencyCode: string;
  baseCurrencySymbol: string;
  currentUserId: string;
  /** null = free transfer between any two members. */
  preset: SettlePreset | null;
  onConfirm: (draft: SettlementDraft) => void;
}

export default function SettleModal({
  onClose,
  participants,
  transactions,
  currencies,
  baseCurrencyCode,
  baseCurrencySymbol,
  currentUserId,
  preset,
  onConfirm,
}: SettleModalProps) {
  // The parent mounts a fresh instance for every payment (see the `key` on
  // <SettleModal> in App), so all initial state can be derived from the preset
  // directly — no state-syncing effect required.
  const debts = useMemo(
    () => calculateSettlements(transactions, participants),
    [transactions, participants]
  );

  const presetDebt = preset ? findDebtBetween(debts, preset.from, preset.to) : undefined;
  const fullPrefill = preset?.mode === 'full' && presetDebt ? presetDebt.amount.toFixed(2) : '';

  const [from, setFrom] = useState(preset?.from ?? currentUserId);
  const [to, setTo] = useState(() => preset?.to ?? participants.find(p => p.id !== currentUserId)?.id ?? '');
  const [amountStr, setAmountStr] = useState(fullPrefill);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(baseCurrencyCode);
  const [rateStr, setRateStr] = useState('1');

  const nameOf = (id: string) => participants.find(p => p.id === id)?.name || 'Unknown';

  // Mark the device's own member without doubling up on a name already called "You".
  const memberLabel = (participant: Participant) =>
    participant.id === currentUserId && participant.name.trim().toLowerCase() !== 'you'
      ? `${participant.name} (You)`
      : participant.name;

  const amount = parseFloat(amountStr) || 0;
  const rate = currencyCode === baseCurrencyCode ? 1 : parseFloat(rateStr) || 0;
  const amountInBase = Number((amount * rate).toFixed(2));

  const canSubmit = !!from && !!to && from !== to && amountInBase > 0 && rate > 0;

  const pairDebt = findDebtBetween(debts, from, to);
  const reversePairDebt = findDebtBetween(debts, to, from);
  const fullAmount = pairDebt?.amount ?? 0;

  // Live preview: runs the exact same maths the app renders with.
  const previewDebts = useMemo(
    () => (canSubmit
      ? simulateSettlement(transactions, participants, {
        from,
        to,
        amount,
        currency: currencyCode,
        rate,
        date,
        note,
      }).debts
      : calculateSettlements(transactions, participants)),
    [canSubmit, transactions, participants, from, to, amount, currencyCode, rate, date, note]
  );

  const remainingForPair = previewDebts.find(d => d.from === from && d.to === to)?.amount ?? 0;
  const isOverpaying = !!pairDebt && amountInBase > pairDebt.amount + 0.005;
  const previewRows = previewDebts.slice(0, 4);

  const secondaryRate = currencies.find(c => c.code === currencyCode)?.rate ?? 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const trimmedNote = note.trim();
    onConfirm({
      from,
      to,
      amount: Number(amount.toFixed(2)),
      currency: currencyCode,
      rate,
      date,
      ...(trimmedNote ? { note: trimmedNote } : {}),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden glass-card rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/50 bg-white/30">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            {preset ? 'Record a Payment' : 'Record a Transfer'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Who is paying whom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Paid by
              </label>
              <select
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all cursor-pointer text-slate-700"
              >
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {memberLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Received by
              </label>
              <select
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all cursor-pointer text-slate-700"
              >
                <option value="">Select member...</option>
                {participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {memberLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {from === to && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50/70 border border-rose-200/70 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Pick two different members.</span>
            </div>
          )}

          {/* Outstanding amount for this pair (only what is still unpaid) */}
          {(pairDebt || reversePairDebt) && (
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1">
              {pairDebt && (
                <p className="text-xs text-slate-600 font-semibold">
                  Outstanding now: {nameOf(from)} owes {nameOf(to)}{' '}
                  <span className="text-rose-500">{baseCurrencySymbol}{pairDebt.amount.toFixed(2)}</span>
                </p>
              )}
              {!pairDebt && reversePairDebt && (
                <p className="text-xs text-slate-600 font-semibold">
                  Outstanding now: {nameOf(to)} owes {nameOf(from)}{' '}
                  <span className="text-emerald-600">{baseCurrencySymbol}{reversePairDebt.amount.toFixed(2)}</span>
                  <span className="text-slate-400 font-medium"> — settling it from the other side works too.</span>
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-slate-400 font-medium">
                {currencies.find(c => c.code === currencyCode)?.symbol ?? baseCurrencySymbol}
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
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all"
              />
            </div>

            {/* Quick amounts relative to the outstanding balance */}
            {fullAmount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pay</span>
                {[
                  { label: 'Full', value: fullAmount },
                  { label: '75%', value: Number((fullAmount * 0.75).toFixed(2)) },
                  { label: '50%', value: Number((fullAmount * 0.5).toFixed(2)) },
                  { label: '25%', value: Number((fullAmount * 0.25).toFixed(2)) },
                ].map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setAmountStr(chip.value.toFixed(2))}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-indigo-100 bg-indigo-50/60 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}

            {currencyCode !== baseCurrencyCode && (
              <p className="text-[11px] text-slate-400 font-semibold mt-2">
                ≈ {baseCurrencySymbol}{amountInBase.toFixed(2)} at the rate below
              </p>
            )}
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Note (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. paid half in cash"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Advanced: currency & rate */}
          <div className="border-t border-dashed border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              Advanced
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currencyCode}
                    onChange={e => {
                      setCurrencyCode(e.target.value);
                      const next = currencies.find(c => c.code === e.target.value)?.rate ?? 1;
                      setRateStr(next.toString());
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all cursor-pointer text-slate-700"
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Rate
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold shrink-0">1 {currencyCode} =</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={currencyCode === baseCurrencyCode}
                      value={currencyCode === baseCurrencyCode ? 1 : rateStr}
                      onChange={e => {
                        if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                          setRateStr(e.target.value);
                        }
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none ${
                        currencyCode === baseCurrencyCode
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'border-slate-200 bg-white/50 text-slate-700 focus:ring-2 focus:ring-indigo-500/30'
                      }`}
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">{baseCurrencyCode}</span>
                  </div>
                </div>
                {currencyCode !== baseCurrencyCode && secondaryRate !== rate && (
                  <p className="col-span-2 text-[11px] text-amber-700 font-semibold">
                    Settings define 1 {currencyCode} = {secondaryRate} {baseCurrencyCode} — this payment uses a custom rate.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Warnings */}
          {isOverpaying && pairDebt && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                This is more than the {baseCurrencySymbol}{pairDebt.amount.toFixed(2)} outstanding between them.
                Recording it will flip the balance, so {nameOf(to)} ends up owing {nameOf(from)}{' '}
                {baseCurrencySymbol}{Math.max(0, amountInBase - pairDebt.amount).toFixed(2)}.
              </span>
            </div>
          )}

          {!pairDebt && !reversePairDebt && amountInBase > 0 && from !== to && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-700">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                No outstanding balance between {nameOf(from)} and {nameOf(to)} right now. A transfer still
                balances correctly through the rest of the group.
              </span>
            </div>
          )}

          {/* Preview */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 uppercase tracking-wider">After this payment</span>
              {canSubmit && (
                <span className="text-slate-400">
                  {debts.length} → {previewDebts.length} step{previewDebts.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {!canSubmit ? (
              <p className="text-xs text-slate-400">Enter an amount to preview the new balances.</p>
            ) : previewRows.length === 0 ? (
              <p className="text-xs text-emerald-300 font-bold">🎉 Everyone will be fully settled up!</p>
            ) : (
              <div className="space-y-1.5">
                {previewRows.map((debt, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-slate-200 truncate">{nameOf(debt.from)}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">{nameOf(debt.to)}</span>
                    </div>
                    <span className="font-black text-amber-400 shrink-0">
                      {baseCurrencySymbol}{debt.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {previewDebts.length > previewRows.length && (
                  <p className="text-[11px] text-slate-500">+ {previewDebts.length - previewRows.length} more step(s)</p>
                )}
                {pairDebt && (
                  <p className="text-[11px] text-slate-400 border-t border-white/10 pt-2">
                    Remaining between {nameOf(from)} and {nameOf(to)}: {baseCurrencySymbol}
                    {remainingForPair.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200/50 bg-white/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
          >
            {canSubmit ? `Record ${baseCurrencySymbol}${amountInBase.toFixed(2)} Payment` : 'Record Payment'}
          </button>
        </div>

      </div>
    </div>
  );
}
