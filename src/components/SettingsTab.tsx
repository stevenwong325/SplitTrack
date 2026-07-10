import React, { useState, useRef } from 'react';
import { 
  Users, 
  Coins, 
  Trash2, 
  Edit3, 
  Check, 
  Download, 
  Upload, 
  Database, 
  User, 
  CheckCircle2 
} from 'lucide-react';
import type { Participant, Currency, AppState } from '../types';

interface SettingsTabProps {
  participants: Participant[];
  currencies: Currency[];
  baseCurrencyCode: string;
  currentUserId: string;
  onAddParticipant: (name: string) => void;
  onRemoveParticipant: (id: string) => void;
  onUpdateParticipant: (id: string, name: string) => void;
  onUpdateCurrencyRate: (code: string, rate: number) => void;
  onSetBaseCurrency: (code: string) => void;
  onSelectCurrentUser: (id: string) => void;
  onClearAllData: () => void;
  onLoadDemoData: () => void;
  onImportData: (imported: AppState) => boolean;
  exportDataJson: string; // The fully formed JSON of the state
}

export default function SettingsTab({
  participants,
  currencies,
  baseCurrencyCode,
  currentUserId,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipant,
  onUpdateCurrencyRate,
  onSetBaseCurrency,
  onSelectCurrentUser,
  onClearAllData,
  onLoadDemoData,
  onImportData,
  exportDataJson,
}: SettingsTabProps) {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (newParticipantName.trim()) {
      onAddParticipant(newParticipantName);
      setNewParticipantName('');
    }
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingParticipantId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onUpdateParticipant(id, editingName);
      setEditingParticipantId(null);
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportDataJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splittrack_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const success = onImportData(parsed);
        if (success) {
          alert('🎉 Data imported successfully!');
        } else {
          alert('❌ Invalid file structure. Failed to import.');
        }
      } catch (err) {
        alert('❌ Error reading file. Please make sure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      
      {/* Settings Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">⚙️ Settings & Configuration</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage members, currency settings, rates, and application data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Manage Participants & Identities */}
        <div className="space-y-6">
          
          {/* Members Panel */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Users className="w-5 h-5 text-indigo-500" /> Manage Group Members
            </h3>

            {/* Quick Add Form */}
            <form onSubmit={handleAddParticipant} className="flex gap-2">
              <input
                type="text"
                placeholder="Add new member..."
                value={newParticipantName}
                onChange={e => setNewParticipantName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all"
              />
              <button
                type="submit"
                disabled={!newParticipantName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
              >
                Add Member
              </button>
            </form>

            {/* Participant List */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {participants.map(p => {
                const isEditing = editingParticipantId === p.id;
                const isYou = p.id === currentUserId;

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isYou 
                        ? 'border-indigo-200 bg-indigo-50/20' 
                        : 'border-slate-100 bg-white/40 hover:bg-white/70'
                    } transition-colors`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-sm border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleSaveEdit(p.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-sm font-bold text-slate-700 truncate">
                          {p.name}
                        </span>
                        {isYou && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full uppercase shrink-0">
                            ⭐ You
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(p.id, p.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Edit Name"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete participant "${p.name}"? Historical split shares will be cleaned up, and transactions they paid for will default to "You".`)) {
                              onRemoveParticipant(p.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Identity Selection (Who is You?) */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-indigo-500" /> Identity Selection (Who is "You"?)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Designate which member represents <strong>You</strong> on this device. This filters stats cards, calculates personal shares in dashboard analysis, and tracks outstanding group liabilities relative to your profile.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {participants.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelectCurrentUser(p.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
                    p.id === currentUserId
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-bold ring-2 ring-indigo-500/10'
                      : 'border-slate-200 bg-white/40 text-slate-600 hover:bg-white/70'
                  }`}
                >
                  <span className="text-sm truncate mr-2">{p.name}</span>
                  {p.id === currentUserId && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Currency Settings & Data Actions */}
        <div className="space-y-6">
          
          {/* Currency Configuration Panel */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Coins className="w-5 h-5 text-indigo-500" /> Currencies & Custom Exchange Rates
            </h3>

            {/* Base Currency Selector */}
            <div className="flex items-center justify-between gap-4 py-1.5 border-b border-dashed border-slate-100">
              <div>
                <span className="text-sm font-bold text-slate-700 block">Base Currency</span>
                <span className="text-[10px] text-slate-400">All analytics and net balances are unified to this currency.</span>
              </div>
              <select
                value={baseCurrencyCode}
                onChange={e => {
                  if (confirm(`Change Base Currency to ${e.target.value}? All existing transaction conversion rates and history values will be recalculated.`)) {
                    onSetBaseCurrency(e.target.value);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 cursor-pointer focus:outline-none"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Exchange Rates Inputs */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Custom exchange rates</span>
              <p className="text-[10px] text-slate-400">Define how much <strong>1 unit of foreign currency</strong> is worth in your Base Currency ({baseCurrencyCode}).</p>

              <div className="space-y-2">
                {currencies.map(c => {
                  const isBase = c.code === baseCurrencyCode;
                  return (
                    <div key={c.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-sm font-bold text-slate-600">
                        1 {c.code} ({c.symbol})
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-bold">=</span>
                        <div className="relative">
                          <input
                            type="text"
                            disabled={isBase}
                            value={c.rate}
                            onChange={e => {
                              const rate = parseFloat(e.target.value) || 0;
                              onUpdateCurrencyRate(c.code, rate);
                            }}
                            className={`w-28 px-3 py-1 text-sm border rounded-lg text-right font-semibold focus:outline-none ${
                              isBase
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-10">
                          {baseCurrencyCode}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Backup, Restoration & Demo Data Panel */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="w-5 h-5 text-indigo-500" /> Backup & Data Maintenance
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              
              {/* Load Demo Data */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Load demo data? This will overwrite your current ledger state.')) {
                    onLoadDemoData();
                  }
                }}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-indigo-100 hover:border-indigo-300 bg-indigo-50/10 hover:bg-indigo-50/40 text-center transition-all group cursor-pointer"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🤖</span>
                <span className="text-xs font-bold text-slate-700">Load Demo Data</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Pre-populate items</span>
              </button>

              {/* Reset App */}
              <button
                type="button"
                onClick={onClearAllData}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-100 hover:border-rose-300 bg-rose-50/10 hover:bg-rose-50/40 text-center transition-all group cursor-pointer"
              >
                <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🧹</span>
                <span className="text-xs font-bold text-slate-700">Clear All Data</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Reset app completely</span>
              </button>

              {/* Export JSON */}
              <button
                type="button"
                onClick={handleExport}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-100 hover:border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/40 text-center transition-all group cursor-pointer"
              >
                <Download className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700">Export JSON</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Save backup locally</span>
              </button>

              {/* Import JSON */}
              <button
                type="button"
                onClick={handleImportClick}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-100 hover:border-amber-300 bg-amber-50/10 hover:bg-amber-50/40 text-center transition-all group cursor-pointer"
              >
                <Upload className="w-5 h-5 text-amber-500 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700">Import JSON</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Restore from backup</span>
              </button>
            </div>

            {/* Hidden File Input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>

        </div>

      </div>

    </div>
  );
}
