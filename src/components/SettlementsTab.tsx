import { useMemo, useState } from 'react';
import { Check, Users, ArrowRight, Share2, ArrowRightLeft } from 'lucide-react';
import type { Debt, Participant, Transaction } from '../types';
import { generateSettlementText, getSettlementParties, settlementPairKey, summarizeSettlementPayments } from '../utils/finance';
import type { SettlePreset } from './SettleModal';

interface SettlementsTabProps {
  participants: Participant[];
  transactions: Transaction[];
  simplifiedDebts: Debt[];
  baseCurrencySymbol: string;
  onOpenSettle: (preset: SettlePreset) => void;
  onOpenTransfer: () => void;
}

export default function SettlementsTab({
  participants,
  transactions,
  simplifiedDebts,
  baseCurrencySymbol,
  onOpenSettle,
  onOpenTransfer,
}: SettlementsTabProps) {
  const [copied, setCopied] = useState(false);

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  // Calculate each participant's bill position and recorded repayments.
  const individualBalances = useMemo(() => {
    const balances: {
      [id: string]: {
        billsPaid: number;
        owed: number;
        settlementsSent: number;
        settlementsReceived: number;
        net: number;
      };
    } = {};
    
    participants.forEach(p => {
      balances[p.id] = {
        billsPaid: 0,
        owed: 0,
        settlementsSent: 0,
        settlementsReceived: 0,
        net: 0,
      };
    });

    transactions.forEach(t => {
      const totalInBase = t.amount * t.rate;

      if (t.type === 'expense' && !t.isPersonal) {
        if (balances[t.paidBy]) {
          balances[t.paidBy].billsPaid += totalInBase;
        }

        t.splits.forEach(s => {
          const shareInBase = s.amount * t.rate;
          if (balances[s.participantId]) {
            balances[s.participantId].owed += shareInBase;
          }
        });
        return;
      }

      if (t.type === 'settlement') {
        const parties = getSettlementParties(t);
        if (!parties) return;

        if (balances[parties.from]) {
          balances[parties.from].settlementsSent += totalInBase;
        }
        if (balances[parties.to]) {
          balances[parties.to].settlementsReceived += totalInBase;
        }
      }
    });

    // Compute net
    Object.keys(balances).forEach(id => {
      const balance = balances[id];
      balance.net =
        balance.billsPaid -
        balance.owed +
        balance.settlementsSent -
        balance.settlementsReceived;
    });

    return balances;
  }, [transactions, participants]);

  // How much each directed pair has already repaid (partial payments included).
  const payments = useMemo(() => summarizeSettlementPayments(transactions), [transactions]);

  const handleCopy = () => {
    const text = generateSettlementText(simplifiedDebts, participants, baseCurrencySymbol);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">🤝 Group Settlement & Balances</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pay a debt in full or in parts — balances re-optimise automatically.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenTransfer}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/70 hover:bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" /> Record Transfer
          </button>

          {simplifiedDebts.length > 0 && (
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/15 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" /> Share Settlement
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Net Group Balances Sheet (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> Individual Member Balance Sheet
              </h3>
              <span className="text-xs text-slate-400 font-semibold">Values in Base Currency</span>
            </div>

            <div className="divide-y divide-slate-100">
              {participants.map(p => {
                const b = individualBalances[p.id] || {
                  billsPaid: 0,
                  owed: 0,
                  settlementsSent: 0,
                  settlementsReceived: 0,
                  net: 0,
                };
                const hasSettlements = b.settlementsSent > 0 || b.settlementsReceived > 0;
                return (
                  <div key={p.id} className="py-4 flex items-center justify-between gap-4 group">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-700">{p.name}</div>
                      <div className="text-xs text-slate-400 font-semibold flex items-center gap-3">
                        <span>Bills paid: {baseCurrencySymbol}{b.billsPaid.toFixed(2)}</span>
                        <span>•</span>
                        <span>Owed share: {baseCurrencySymbol}{b.owed.toFixed(2)}</span>
                      </div>
                      {hasSettlements && (
                        <div className="text-[11px] text-indigo-500 font-semibold flex items-center gap-3">
                          <span>Repayments sent: {baseCurrencySymbol}{b.settlementsSent.toFixed(2)}</span>
                          <span>•</span>
                          <span>Received: {baseCurrencySymbol}{b.settlementsReceived.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      {Math.abs(b.net) < 0.01 ? (
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                          Fully Settled
                        </span>
                      ) : b.net > 0 ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                            Is Owed
                          </span>
                          <div className="text-sm font-black text-emerald-600 pt-1">
                            +{baseCurrencySymbol}{b.net.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full">
                            Owes Group
                          </span>
                          <div className="text-sm font-black text-rose-500 pt-1">
                            -{baseCurrencySymbol}{Math.abs(b.net).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Simplified Settlements (1/3 width) */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl bg-slate-900 text-white border-none shadow-xl h-full flex flex-col">
            <h3 className="text-base font-bold pb-4 border-b border-white/10 flex items-center gap-2">
              ✨ Optimized Settlements ({simplifiedDebts.length})
            </h3>

            {simplifiedDebts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <span className="text-5xl mb-3">🎉</span>
                <p className="font-bold text-white text-sm">Everyone is all settled up!</p>
                <p className="text-xs mt-1 text-slate-400 leading-relaxed">
                  No outstanding debts are remaining in this group. Use “Record Transfer” for a standalone payment.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[450px] pr-1">
                {simplifiedDebts.map((d, idx) => {
                  const fromName = getParticipantName(d.from);
                  const toName = getParticipantName(d.to);
                  const paid = payments[settlementPairKey(d.from, d.to)];
                  return (
                    <div
                      key={`${d.from}-${d.to}-${idx}`}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 hover:bg-white/10 transition-colors"
                    >
                      {/* Connection row */}
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="font-semibold text-slate-300 truncate max-w-[85px]">{fromName}</div>
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">owes</span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="font-semibold text-slate-300 truncate max-w-[85px] text-right">{toName}</div>
                      </div>

                      {/* Cash Row & Action Buttons */}
                      <div className="border-t border-white/5 pt-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-black text-amber-400">
                            {baseCurrencySymbol}{d.amount.toFixed(2)}
                          </span>
                          {paid && (
                            <span className="text-[10px] text-slate-400 font-semibold text-right">
                              already paid {baseCurrencySymbol}{paid.amount.toFixed(2)} ({paid.count})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenSettle({ from: d.from, to: d.to, mode: 'full' })}
                            className="flex-1 px-2.5 py-1.5 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow shadow-indigo-600/30 active:scale-95 cursor-pointer"
                          >
                            💸 Pay {baseCurrencySymbol}{d.amount.toFixed(2)}
                          </button>
                          <button
                            onClick={() => onOpenSettle({ from: d.from, to: d.to, mode: 'partial' })}
                            className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-white text-slate-800 hover:bg-slate-100 shadow-lg active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                          >
                            Pay partial…
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {simplifiedDebts.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-auto">
                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  💡 <strong>Tip:</strong> Pick “Pay partial…” to pay only part of a debt — the record is kept and the
                  optimised list recalculates the remaining steps for the whole group.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
