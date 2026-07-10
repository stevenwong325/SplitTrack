import { useMemo, useState } from 'react';
import { Check, Users, ArrowRight, Share2 } from 'lucide-react';
import type { Debt, Participant, Transaction } from '../types';
import { generateSettlementText } from '../utils/finance';

interface SettlementsTabProps {
  participants: Participant[];
  transactions: Transaction[];
  simplifiedDebts: Debt[];
  baseCurrencySymbol: string;
  onRecordSettlement: (fromId: string, toId: string, amount: number) => void;
}

export default function SettlementsTab({
  participants,
  transactions,
  simplifiedDebts,
  baseCurrencySymbol,
  onRecordSettlement,
}: SettlementsTabProps) {
  const [copied, setCopied] = useState(false);

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  // Calculate each participant's individual group balance sheet (Paid vs Owed)
  const individualBalances = useMemo(() => {
    const balances: { [id: string]: { paid: number; owed: number; net: number } } = {};
    
    participants.forEach(p => {
      balances[p.id] = { paid: 0, owed: 0, net: 0 };
    });

    transactions.forEach(t => {
      if (t.type !== 'expense' || t.isPersonal) return;

      const totalInBase = t.amount * t.rate;
      
      // Paid
      if (balances[t.paidBy]) {
        balances[t.paidBy].paid += totalInBase;
      }

      // Owed share
      t.splits.forEach(s => {
        const shareInBase = s.amount * t.rate;
        if (balances[s.participantId]) {
          balances[s.participantId].owed += shareInBase;
        }
      });
    });

    // Compute net
    Object.keys(balances).forEach(id => {
      balances[id].net = balances[id].paid - balances[id].owed;
    });

    return balances;
  }, [transactions, participants]);

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
          <p className="text-sm text-slate-500 mt-0.5">Optimized transaction matrix to settle debts with the fewest steps.</p>
        </div>

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
                const b = individualBalances[p.id] || { paid: 0, owed: 0, net: 0 };
                return (
                  <div key={p.id} className="py-4 flex items-center justify-between gap-4 group">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-700">{p.name}</div>
                      <div className="text-xs text-slate-400 font-semibold flex items-center gap-3">
                        <span>Paid: {baseCurrencySymbol}{b.paid.toFixed(2)}</span>
                        <span>•</span>
                        <span>Owed share: {baseCurrencySymbol}{b.owed.toFixed(2)}</span>
                      </div>
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
                <p className="text-xs mt-1 text-slate-400 leading-relaxed">No outstanding debts are remaining in this group.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[450px] pr-1">
                {simplifiedDebts.map((d, idx) => {
                  const fromName = getParticipantName(d.from);
                  const toName = getParticipantName(d.to);
                  return (
                    <div
                      key={idx}
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

                      {/* Cash Row & Action Button */}
                      <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-2">
                        <span className="text-base font-black text-amber-400">
                          {baseCurrencySymbol}{d.amount.toFixed(2)}
                        </span>
                        
                        <button
                          onClick={() => {
                            if (confirm(`Mark that ${fromName} paid ${toName} ${baseCurrencySymbol}${d.amount}? This will record a balancing transaction.`)) {
                              onRecordSettlement(d.from, d.to, d.amount);
                            }
                          }}
                          className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shadow shadow-indigo-600/30 active:scale-95 cursor-pointer"
                        >
                          💸 Paid & Settle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {simplifiedDebts.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-auto">
                <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                  💡 <strong>Tip:</strong> Clicking "Paid & Settle" automatically adds a balancing transaction that resolves the exact debt between members, updating the ledger history.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
