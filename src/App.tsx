import { useState, useMemo } from 'react';
import { 
  PieChart, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  Plus, 
  Coins 
} from 'lucide-react';
import { useAppState } from './hooks/useAppState';
import { calculateSettlements } from './utils/finance';
import DashboardTab from './components/DashboardTab';
import TransactionsTab from './components/TransactionsTab';
import SettlementsTab from './components/SettlementsTab';
import SettingsTab from './components/SettingsTab';
import AddTransactionModal from './components/AddTransactionModal';

export default function App() {
  const {
    participants,
    currencies,
    transactions,
    baseCurrencyCode,
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
    clearAllData,
    loadDemoData,
    importData,
  } = useAppState();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'settlements' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Compute simplified net debts from group transactions
  const simplifiedDebts = useMemo(() => {
    return calculateSettlements(transactions, participants);
  }, [transactions, participants]);

  // Handle Recording of Debt Settlement
  const handleRecordSettlement = (fromId: string, toId: string, amount: number) => {
    const fromName = participants.find(p => p.id === fromId)?.name || 'Someone';
    const toName = participants.find(p => p.id === toId)?.name || 'Someone';

    addTransaction({
      description: `🤝 Settle: ${fromName} paid ${toName}`,
      amount,
      currency: baseCurrencyCode,
      rate: 1.0,
      date: new Date().toISOString().split('T')[0], // Today
      category: 'Others',
      type: 'expense',
      paidBy: fromId, // Payer (debtor) is credited
      isPersonal: false,
      splitMode: 'custom',
      splits: [
        { participantId: toId, amount }, // Recipient (creditor) is allocated the debit, neutralizing both
      ],
    });
  };

  const handleEditClick = (t: any) => {
    setEditingTransaction(t);
    setIsAddModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsAddModalOpen(true);
  };

  // State in JSON form for settings export
  const exportDataJson = useMemo(() => {
    return JSON.stringify({
      participants,
      currencies,
      transactions,
      baseCurrencyCode,
    }, null, 2);
  }, [participants, currencies, transactions, baseCurrencyCode]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-0">
      
      {/* Glossy Header Bar (Desktop/Mobile top banner) */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">
              S
            </div>
            <div>
              <h1 className="text-base font-black text-slate-800 tracking-tight leading-none m-0">SplitTrack</h1>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Multi-Currency Splitter</span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              <PieChart className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              <FileText className="w-4 h-4" /> Transactions
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'settlements'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              <Users className="w-4 h-4" /> Settlements
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> Settings
            </button>
          </nav>

          {/* Header Quick Actions */}
          <div className="flex items-center gap-2.5">
            {/* Quick Add Floating Button on desktop */}
            <button
              onClick={handleAddClick}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Record Bill
            </button>

            {/* Quick Currency display status */}
            <div className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/50 flex items-center gap-1 text-[11px] font-black text-slate-500 uppercase tracking-wide">
              <Coins className="w-3.5 h-3.5 text-indigo-500" /> {baseCurrencyCode} ({baseCurrency.symbol})
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Workspace Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <div className="animate-fade-in duration-300">
          {activeTab === 'dashboard' && (
            <DashboardTab
              transactions={transactions}
              participants={participants}
              currentUserId={currentUserId}
              simplifiedDebts={simplifiedDebts}
              baseCurrencySymbol={baseCurrency.symbol}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsTab
              transactions={transactions}
              participants={participants}
              currencies={currencies}
              currentUserId={currentUserId}
              baseCurrencySymbol={baseCurrency.symbol}
              onAddClick={handleAddClick}
              onEditClick={handleEditClick}
              onDeleteClick={deleteTransaction}
            />
          )}

          {activeTab === 'settlements' && (
            <SettlementsTab
              participants={participants}
              transactions={transactions}
              simplifiedDebts={simplifiedDebts}
              baseCurrencySymbol={baseCurrency.symbol}
              onRecordSettlement={handleRecordSettlement}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              participants={participants}
              currencies={currencies}
              baseCurrencyCode={baseCurrencyCode}
              currentUserId={currentUserId}
              onAddParticipant={addParticipant}
              onRemoveParticipant={removeParticipant}
              onUpdateParticipant={updateParticipant}
              onUpdateCurrencyRate={updateCurrencyRate}
              onSetBaseCurrency={setBaseCurrency}
              onSelectCurrentUser={setCurrentUserId}
              onClearAllData={clearAllData}
              onLoadDemoData={loadDemoData}
              onImportData={importData}
              exportDataJson={exportDataJson}
            />
          )}
        </div>
      </main>

      {/* Mobile Responsive Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200/50 shadow-lg flex items-center justify-around h-16 px-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-center transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-center transition-all cursor-pointer ${
            activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-bold">Records</span>
        </button>

        {/* Floating Quick Add Button on mobile */}
        <button
          onClick={handleAddClick}
          className="relative -top-3 w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all border-4 border-slate-50 cursor-pointer"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-center transition-all cursor-pointer ${
            activeTab === 'settlements' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold">Splits</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-center transition-all cursor-pointer ${
            activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </div>

      {/* Add / Edit Transaction Modal Overlay */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        participants={participants}
        currencies={currencies}
        baseCurrencyCode={baseCurrencyCode}
        currentUserId={currentUserId}
        onAdd={addTransaction}
        editingTransaction={editingTransaction}
        onUpdate={updateTransaction}
      />

    </div>
  );
}
