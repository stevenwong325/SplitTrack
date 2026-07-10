import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Utensils, 
  Car, 
  Home, 
  Film, 
  ShoppingBag, 
  HelpCircle, 
  DollarSign 
} from 'lucide-react';
import type { Transaction, Participant, Debt, Category } from '../types';
import { calculateUserStats } from '../utils/finance';

interface DashboardTabProps {
  transactions: Transaction[];
  participants: Participant[];
  currentUserId: string;
  simplifiedDebts: Debt[];
  baseCurrencySymbol: string;
  selectedMonth: string; // 'YYYY-MM' or 'all'
  onSelectMonth: (month: string) => void;
}

// Map categories to beautiful colors and Lucide icons
export const CATEGORY_CONFIG: {
  [key in Category | 'Income']: {
    color: string;
    bgColor: string;
    icon: React.ComponentType<{ className?: string }>;
  };
} = {
  Food: { color: 'text-orange-500', bgColor: 'bg-orange-500', icon: Utensils },
  Transport: { color: 'text-blue-500', bgColor: 'bg-blue-500', icon: Car },
  Lodging: { color: 'text-purple-500', bgColor: 'bg-purple-500', icon: Home },
  Entertainment: { color: 'text-pink-500', bgColor: 'bg-pink-500', icon: Film },
  Shopping: { color: 'text-amber-500', bgColor: 'bg-amber-500', icon: ShoppingBag },
  Others: { color: 'text-slate-500', bgColor: 'bg-slate-500', icon: HelpCircle },
  Income: { color: 'text-emerald-500', bgColor: 'bg-emerald-500', icon: DollarSign },
};

export default function DashboardTab({
  transactions,
  participants,
  currentUserId,
  simplifiedDebts,
  baseCurrencySymbol,
  selectedMonth,
  onSelectMonth,
}: DashboardTabProps) {
  
  // Extract all unique months from transactions for filter dropdown
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        // Format YYYY-MM
        months.add(t.date.substring(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)); // Newest first
  }, [transactions]);

  // Compute stats based on filters
  const stats = useMemo(() => {
    const filter = selectedMonth === 'all' ? undefined : selectedMonth;
    return calculateUserStats(transactions, currentUserId, simplifiedDebts, filter);
  }, [transactions, currentUserId, simplifiedDebts, selectedMonth]);

  const activeParticipant = useMemo(() => {
    return participants.find(p => p.id === currentUserId);
  }, [participants, currentUserId]);

  // Sum of expenses for percentages
  const totalExpenseSum = useMemo(() => {
    return Object.entries(stats.categoryBreakdown).reduce((sum, [cat, val]) => {
      if (cat === 'Income') return sum;
      return sum + (val || 0);
    }, 0);
  }, [stats.categoryBreakdown]);

  // Sort categories by expenditure descending
  const sortedCategories = useMemo(() => {
    return Object.entries(stats.categoryBreakdown)
      .filter(([cat]) => cat !== 'Income')
      .map(([cat, val]) => ({
        category: cat as Category,
        amount: val || 0,
        percentage: totalExpenseSum > 0 ? ((val || 0) / totalExpenseSum) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [stats.categoryBreakdown, totalExpenseSum]);

  return (
    <div className="space-y-6">
      
      {/* Month Filter Dropdown & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            👋 Welcome back, <span className="text-indigo-600">{activeParticipant?.name || 'User'}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Here is your financial status overview.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">Filter Month:</span>
          <select
            value={selectedMonth}
            onChange={e => onSelectMonth(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <option value="all">🗓️ All Time</option>
            {uniqueMonths.map(m => {
              const [year, month] = m.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              const label = date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
              return (
                <option key={m} value={m}>
                  📅 {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Income */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
              <h3 className="text-2xl font-bold text-emerald-600">
                {baseCurrencySymbol}
                {stats.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-emerald-600 font-semibold bg-emerald-50/50 px-2.5 py-1 rounded-lg w-max">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active Income Stream</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
              <h3 className="text-2xl font-bold text-rose-500">
                {baseCurrencySymbol}
                {stats.totalPersonalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-500 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] text-rose-500 font-semibold bg-rose-50/50 px-2.5 py-1 rounded-lg w-max">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Personal + Split Share</span>
          </div>
        </div>

        {/* Net Balance */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Balance</span>
              <h3 className={`text-2xl font-bold ${stats.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {stats.netBalance < 0 ? '-' : ''}
                {baseCurrencySymbol}
                {Math.abs(stats.netBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${
              stats.netBalance >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className={`flex items-center gap-1.5 mt-4 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-max ${
            stats.netBalance >= 0 ? 'bg-indigo-50/50 text-indigo-600' : 'bg-rose-50/50 text-rose-600'
          }`}>
            <span>{stats.netBalance >= 0 ? '👍 Net Positive Saving' : '⚠️ Over-budget Warning'}</span>
          </div>
        </div>

        {/* Group Settlements */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1 text-slate-800">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Group Settlements</span>
              <div className="space-y-0.5 pt-1">
                <div className="text-xs font-semibold flex items-center gap-1">
                  <span className="text-emerald-600">To Recv:</span>
                  <span className="text-emerald-700">
                    {baseCurrencySymbol}
                    {stats.totalToReceive.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs font-semibold flex items-center gap-1">
                  <span className="text-rose-500">To Owe:</span>
                  <span className="text-rose-600">
                    {baseCurrencySymbol}
                    {stats.totalToOwe.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-500 group-hover:scale-110 transition-transform">
              <span className="text-lg">🤝</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-700 font-semibold bg-amber-50/50 px-2.5 py-1 rounded-lg w-max">
            <span>
              {stats.totalToReceive > stats.totalToOwe 
                ? '📈 Overall Net Lender' 
                : stats.totalToOwe > 0 
                  ? '📉 Overall Net Borrower' 
                  : '🎉 Net Balance Zero'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Category Breakdown & Visual progress bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category breakdown (Left 2/3 or Full if simple) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800">📊 Monthly Category Expense Breakdown</h3>
            <span className="text-xs text-slate-400 font-semibold">Ordered by highest spending</span>
          </div>

          {sortedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="text-5xl mb-3">📁</div>
              <p className="font-semibold text-slate-500">No expenses found in this period</p>
              <p className="text-xs text-slate-400 mt-1">Try adding personal or group expenses under Transactions tab.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedCategories.map(cat => {
                const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG['Others'];
                const Icon = config.icon;
                return (
                  <div key={cat.category} className="space-y-2 group">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${config.color} bg-white border border-slate-100 shadow-sm transition-transform group-hover:scale-105`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-700">{cat.category}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {baseCurrencySymbol}
                        {cat.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        className={`${config.bgColor} h-full rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mini statistics card / helper panel (Right 1/3) */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-6 bg-indigo-900 text-white border-none shadow-indigo-100 shadow-lg">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">✨ Spending Insights</h3>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Based on your records for <strong>{selectedMonth === 'all' ? 'All Time' : selectedMonth}</strong>, your primary expense category is <strong>{sortedCategories[0]?.category || 'None'}</strong>.
            </p>
            
            {totalExpenseSum > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-xs text-indigo-200 font-semibold uppercase">
                  <span>Saving Ratio</span>
                  <span>
                    {stats.totalIncome > 0 
                      ? `${((stats.netBalance / stats.totalIncome) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-indigo-950/60 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${stats.totalIncome > 0 ? Math.max(0, Math.min(100, (stats.netBalance / stats.totalIncome) * 100)) : 0}%` 
                    }}
                  />
                </div>
                <p className="text-[11px] text-indigo-200">
                  {stats.netBalance > 0 
                    ? "Great job! You're saving money this month." 
                    : "You're spending more than your income this month. Keep an eye out!"}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white/10 border border-white/15 space-y-2">
            <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">🚀 Quick Split Tip</h4>
            <p className="text-xs text-indigo-100">
              When traveling in groups, toggle "Group Split" when adding any common bill. SplitTrack will automatically compute optimal debts so you don't have to keep doing manual math transfers!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
