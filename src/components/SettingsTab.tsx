import React, { useMemo, useState, useRef } from 'react';
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
  CheckCircle2,
  Lightbulb,
  ClipboardCopy,
  Plus,
  Search,
  Circle
} from 'lucide-react';
import type { Participant, Currency, BackupPayload, Remark, RemarkStatus, RemarkTag } from '../types';
import { getAvailablePresets, INITIAL_RATES_TO_HKD } from '../constants/currencies';
import { REMARK_TAGS, countOpenRemarks, filterRemarks, nextRemarkTag, remarksToMarkdown, sortRemarks } from '../utils/remarks';

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
  onAddCurrency: (code: string, symbol: string, rate?: number) => boolean;
  onRemoveCurrency: (code: string) => boolean;
  onSelectCurrentUser: (id: string) => void;
  onClearAllData: () => void;
  onLoadDemoData: () => void;
  onImportData: (imported: BackupPayload) => boolean;
  exportDataJson: string; // The fully formed JSON of the state
  remarks: Remark[];
  onAddRemark: (text: string, tag?: RemarkTag) => void;
  onToggleRemark: (id: string) => void;
  onUpdateRemarkText: (id: string, text: string) => void;
  onSetRemarkTag: (id: string, tag?: RemarkTag) => void;
  onRemoveRemark: (id: string) => void;
  onClearDoneRemarks: () => void;
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
  onAddCurrency,
  onRemoveCurrency,
  onSelectCurrentUser,
  onClearAllData,
  onLoadDemoData,
  onImportData,
  exportDataJson,
  remarks,
  onAddRemark,
  onToggleRemark,
  onUpdateRemarkText,
  onSetRemarkTag,
  onRemoveRemark,
  onClearDoneRemarks,
}: SettingsTabProps) {
  const [newParticipantName, setNewParticipantName] = useState('');
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // States for currency additions
  const [selectedPresetCode, setSelectedPresetCode] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customRate, setCustomRate] = useState('');
  
  // States for improvement notes (Remarks)
  const [newRemarkText, setNewRemarkText] = useState('');
  const [newRemarkTag, setNewRemarkTag] = useState<RemarkTag | ''>('');
  const [remarkFilter, setRemarkFilter] = useState<'all' | RemarkStatus>('all');
  const [remarkQuery, setRemarkQuery] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');
  const [remarksCopied, setRemarksCopied] = useState(false);

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

  /* ----------------------------- Improvement notes ----------------------------- */

  const openRemarkCount = useMemo(() => countOpenRemarks(remarks), [remarks]);
  const doneRemarkCount = remarks.length - openRemarkCount;

  const visibleRemarks = useMemo(
    () => sortRemarks(filterRemarks(remarks, { status: remarkFilter, query: remarkQuery })),
    [remarks, remarkFilter, remarkQuery]
  );

  const handleAddRemark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemarkText.trim()) return;
    onAddRemark(newRemarkText, newRemarkTag || undefined);
    setNewRemarkText('');
    setNewRemarkTag('');
  };

  const handleStartRemarkEdit = (remark: Remark) => {
    setEditingRemarkId(remark.id);
    setEditingRemarkText(remark.text);
  };

  const handleSaveRemarkEdit = (id: string) => {
    onUpdateRemarkText(id, editingRemarkText);
    setEditingRemarkId(null);
  };

  const handleCopyRemarks = () => {
    navigator.clipboard.writeText(remarksToMarkdown(remarks)).then(() => {
      setRemarksCopied(true);
      setTimeout(() => setRemarksCopied(false), 2000);
    });
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

            {/* Quick Add Presets */}
            <div className="space-y-2.5 pt-1.5 border-b border-dashed border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Add Common Currency</span>
              {(() => {
                const availablePresets = getAvailablePresets(currencies.map(c => c.code));
                return availablePresets.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedPresetCode}
                      onChange={e => setSelectedPresetCode(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">Select a currency...</option>
                      {availablePresets.map(p => (
                        <option key={p.code} value={p.code}>
                          {p.code} ({p.symbol})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPresetCode) {
                          const preset = availablePresets.find(p => p.code === selectedPresetCode);
                          if (preset) {
                            // Convert suggestedRate (relative to HKD) to be relative to the current Base Currency
                            const hkdCurrency = currencies.find(c => c.code === 'HKD');
                            const rateOfHKD = hkdCurrency 
                              ? hkdCurrency.rate 
                              : (1.0 / (INITIAL_RATES_TO_HKD[baseCurrencyCode] || 1.0));

                            const convertedRate = Number((preset.suggestedRate * rateOfHKD).toFixed(6));

                            const success = onAddCurrency(preset.code, preset.symbol, convertedRate);
                            if (success) {
                              setSelectedPresetCode('');
                            }
                          }
                        }
                      }}
                      disabled={!selectedPresetCode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">All predefined currencies have been added.</p>
                );
              })()}
            </div>

            {/* Custom Currency Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const codeUpper = customCode.trim().toUpperCase();
                if (!/^[A-Z]{3}$/.test(codeUpper)) {
                  alert('Currency code must be exactly 3 uppercase letters (ISO 4217).');
                  return;
                }
                const isDup = currencies.some(c => c.code.toUpperCase() === codeUpper);
                if (isDup) {
                  alert(`Currency "${codeUpper}" already exists.`);
                  return;
                }
                const symb = customSymbol.trim();
                if (!symb) {
                  alert('Currency symbol is required.');
                  return;
                }
                const rateFloat = parseFloat(customRate) || 1.0;
                if (rateFloat <= 0) {
                  alert('Rate must be greater than 0.');
                  return;
                }
                const success = onAddCurrency(codeUpper, symb, rateFloat);
                if (success) {
                  setCustomCode('');
                  setCustomSymbol('');
                  setCustomRate('');
                }
              }}
              className="space-y-2.5 pt-1.5 border-b border-dashed border-slate-100 pb-3"
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Add Custom Currency</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Code (CAD)"
                    value={customCode}
                    onChange={e => setCustomCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all uppercase"
                    maxLength={3}
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Symbol ($)"
                    value={customSymbol}
                    onChange={e => setCustomSymbol(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all"
                    required
                  />
                </div>
                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={`Rate (vs ${baseCurrencyCode})`}
                    value={customRate}
                    onChange={e => {
                      if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                        setCustomRate(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!customCode.trim() || !customSymbol.trim() || !customRate.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
                >
                  Add Custom Currency
                </button>
              </div>
            </form>

            {/* Exchange Rates Inputs */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Custom exchange rates</span>
              <p className="text-[10px] text-slate-400">Define how much <strong>1 unit of foreign currency</strong> is worth in your Base Currency ({baseCurrencyCode}).</p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {currencies.map(c => {
                  const isBase = c.code === baseCurrencyCode;
                  return (
                    <div key={c.code} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm font-bold text-slate-600">
                          1 {c.code} ({c.symbol})
                        </span>
                        {isBase && (
                          <span className="inline-flex items-center text-[8px] font-bold text-indigo-600 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded uppercase shrink-0">
                            Base
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400 font-bold">=</span>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isBase}
                            value={c.rate}
                            onChange={e => {
                              const rate = parseFloat(e.target.value) || 0;
                              onUpdateCurrencyRate(c.code, rate);
                            }}
                            className={`w-24 px-2.5 py-1 text-sm border rounded-lg text-right font-semibold focus:outline-none ${
                              isBase
                                ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'border-slate-300 bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-8 truncate">
                          {baseCurrencyCode}
                        </span>

                        {/* Delete Button */}
                        {!isBase ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete the currency "${c.code}"?`)) {
                                onRemoveCurrency(c.code);
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Currency"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="w-5.5" />
                        )}
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

      {/* Improvement Notes (Remarks) Panel */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Improvement Notes
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {openRemarkCount} open
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyRemarks}
              disabled={remarks.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 bg-white/60 text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {remarksCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5" /> Copy as Markdown
                </>
              )}
            </button>

            {doneRemarkCount > 0 && (
              <button
                type="button"
                onClick={onClearDoneRemarks}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200 bg-white/60 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer"
              >
                Clear done ({doneRemarkCount})
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Jot down anything this app should still do better. Notes are kept in a separate storage slot,
          so clearing the ledger or loading demo data never deletes them.
        </p>

        {/* Quick add row */}
        <form onSubmit={handleAddRemark} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="What could be improved?"
            value={newRemarkText}
            onChange={e => setNewRemarkText(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm transition-all placeholder:text-slate-400"
          />
          <div className="flex gap-2">
            <select
              value={newRemarkTag}
              onChange={e => setNewRemarkTag(e.target.value as RemarkTag | '')}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">No tag</option>
              {REMARK_TAGS.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newRemarkText.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'open', 'done'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setRemarkFilter(status)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                remarkFilter === status
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white/50 text-slate-500 hover:bg-white'
              }`}
            >
              {status === 'all' ? `All (${remarks.length})` : status === 'open' ? `Open (${openRemarkCount})` : `Done (${doneRemarkCount})`}
            </button>
          ))}

          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={remarkQuery}
              onChange={e => setRemarkQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Notes list */}
        {visibleRemarks.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <span className="text-3xl block mb-2">🪄</span>
            <p className="text-sm font-bold text-slate-500">
              {remarks.length === 0 ? 'No notes yet' : 'No notes match this filter'}
            </p>
            <p className="text-xs mt-0.5">
              {remarks.length === 0
                ? 'Use the 💡 button in the header to capture an idea from any screen.'
                : 'Try a different filter or search term.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {visibleRemarks.map(remark => {
              const isEditing = editingRemarkId === remark.id;
              const isDone = remark.status === 'done';

              return (
                <div
                  key={remark.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    isDone ? 'border-slate-100 bg-slate-50/70' : 'border-slate-100 bg-white/50 hover:bg-white/80'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleRemark(remark.id)}
                    title={isDone ? 'Mark as open' : 'Mark as done'}
                    className="mt-0.5 shrink-0 cursor-pointer"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-500 transition-colors" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={editingRemarkText}
                          onChange={e => setEditingRemarkText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRemarkEdit(remark.id);
                            } else if (e.key === 'Escape') {
                              setEditingRemarkId(null);
                            }
                          }}
                          className="flex-1 px-2.5 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRemarkEdit(remark.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className={`text-sm leading-snug break-words ${isDone ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {remark.text}
                      </p>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onSetRemarkTag(remark.id, nextRemarkTag(remark.tag))}
                        title="Click to change the tag"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                          remark.tag
                            ? 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
                            : 'text-slate-400 bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {remark.tag || 'No tag'}
                      </button>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(remark.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartRemarkEdit(remark)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveRemark(remark.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
