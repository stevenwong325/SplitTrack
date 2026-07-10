import { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit3, Users, User, ArrowUp } from 'lucide-react';
import type { Transaction, Participant, Currency } from '../types';
import { CATEGORY_CONFIG } from './DashboardTab';

interface TransactionsTabProps {
  transactions: Transaction[];
  participants: Participant[];
  currencies: Currency[];
  currentUserId: string;
  baseCurrencySymbol: string;
  onAddClick: () => void;
  onEditClick: (transaction: Transaction) => void;
  onDeleteClick: (id: string) => void;
}

export default function TransactionsTab({
  transactions,
  participants,
  currencies,
  currentUserId,
  baseCurrencySymbol,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: TransactionsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || 'Unknown';
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || '$';
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search text filter
      const descMatch = 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category dropdown filter
      const categoryMatch = categoryFilter === 'all' || t.category === categoryFilter;

      // Type dropdown filter (expense, income, personal, split)
      let typeMatch = true;
      if (typeFilter === 'expense') typeMatch = t.type === 'expense';
      else if (typeFilter === 'income') typeMatch = t.type === 'income';
      else if (typeFilter === 'personal') typeMatch = t.type === 'expense' && t.isPersonal;
      else if (typeFilter === 'split') typeMatch = t.type === 'expense' && !t.isPersonal;

      return descMatch && categoryMatch && typeMatch;
    });
  }, [transactions, searchQuery, categoryFilter, typeFilter]);

  // Group transactions by Month (YYYY-MM)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const monthKey = t.date.substring(0, 7); // 'YYYY-MM'
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(t);
    });

    // Sort months descending, and items within months descending by date
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, items]) => {
        const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));
        return { month, items: sortedItems };
      });
  }, [filteredTransactions]);

  const formatMonthHeader = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  const formatWeekday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4 rounded-2xl">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-2.5 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/40 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 text-sm font-medium"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">📂 All Categories</option>
            <option value="Food">🍔 Food</option>
            <option value="Transport">🚗 Transport</option>
            <option value="Lodging">🏨 Lodging</option>
            <option value="Entertainment">🎬 Entertainment</option>
            <option value="Shopping">🛍️ Shopping</option>
            <option value="Others">❓ Others</option>
            <option value="Income">💰 Income</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">🔄 All Types</option>
            <option value="expense">💸 Expenses Only</option>
            <option value="income">💰 Incomes Only</option>
            <option value="personal">👤 Personal Expenses</option>
            <option value="split">👥 Group Splits</option>
          </select>

          {/* Add Transaction Button */}
          <button
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>
      </div>

      {/* Transaction List Grouped by Month */}
      {groupedTransactions.length === 0 ? (
        <div className="glass-card p-16 rounded-2xl flex flex-col items-center justify-center text-center text-slate-400">
          <span className="text-6xl mb-4">🔍</span>
          <h3 className="text-lg font-bold text-slate-600">No transactions found</h3>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or add a new record to get started!</p>
          <button
            onClick={onAddClick}
            className="mt-4 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            ➕ Record Your First Bill
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTransactions.map(({ month, items }) => (
            <div key={month} className="space-y-3">
              
              {/* Month Header Banner */}
              <div className="flex items-center justify-between px-2 pt-1 border-b border-slate-200/40 pb-2">
                <h3 className="text-sm font-bold text-slate-500 tracking-wide uppercase flex items-center gap-1.5">
                  📅 {formatMonthHeader(month)}
                </h3>
                <span className="text-xs bg-slate-100 font-semibold px-2.5 py-0.5 rounded-full text-slate-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Transactions in Month */}
              <div className="space-y-3">
                {items.map(t => {
                  const config = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG['Others'];
                  const Icon = config.icon;
                  const isIncome = t.type === 'income';
                  const symbol = getCurrencySymbol(t.currency);

                  return (
                    <div
                      key={t.id}
                      className="glass-card p-4 rounded-2xl flex items-center justify-between gap-4 hover:shadow-md transition-all group duration-300"
                    >
                      {/* Left: Date + Category Icon */}
                      <div className="flex items-center gap-4">
                        
                        {/* Day/Weekday block */}
                        <div className="flex flex-col items-center justify-center bg-slate-100 rounded-xl w-12 h-12 shrink-0">
                          <span className="text-base font-bold text-slate-700 leading-none mb-0.5">
                            {formatDay(t.date)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase leading-none">
                            {formatWeekday(t.date)}
                          </span>
                        </div>

                        {/* Category Icon */}
                        <div className={`p-2.5 rounded-full bg-white border border-slate-100 shadow-sm ${config.color} shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Description & Split Info */}
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                            {t.description}
                          </h4>
                          
                          {/* Split/Personal Tag */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isIncome ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                <ArrowUp className="w-3 h-3" /> Income
                              </span>
                            ) : t.isPersonal ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                <User className="w-3 h-3" /> Personal Expense
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <Users className="w-3 h-3" /> Group split
                                <span className="text-slate-400 font-medium">
                                  (Paid by {t.paidBy === currentUserId ? 'You' : getParticipantName(t.paidBy)})
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Actions */}
                      <div className="flex items-center gap-4 shrink-0">
                        
                        {/* Amounts block */}
                        <div className="text-right space-y-0.5">
                          {/* Main Amount (In Original Currency) */}
                          <div className={`font-bold text-sm sm:text-base ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {isIncome ? '+' : '-'}{symbol}
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>

                          {/* Secondary Amount (In Base Currency if different) */}
                          {t.currency !== baseCurrencySymbol && (
                            <div className="text-[11px] text-slate-400 font-semibold">
                              ≈ {baseCurrencySymbol}
                              {(t.amount * t.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>

                        {/* Edit & Delete Action Panel */}
                        <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => onEditClick(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this transaction?')) {
                                onDeleteClick(t.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
