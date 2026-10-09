import { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import type { RemarkTag } from '../types';
import { REMARK_TAGS } from '../utils/remarks';

interface QuickRemarkModalProps {
  onClose: () => void;
  onSubmit: (text: string, tag?: RemarkTag) => void;
  openCount: number;
}

/**
 * Minimal capture form so an improvement idea can be jotted down from any tab
 * without leaving the current screen. Full management lives in Settings.
 */
export default function QuickRemarkModal({
  onClose,
  onSubmit,
  openCount,
}: QuickRemarkModalProps) {
  // Mounted fresh by the parent on every open, so the fields start empty.
  const [text, setText] = useState('');
  const [tag, setTag] = useState<RemarkTag | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text, tag || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden glass-card rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200/50 bg-white/30">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" /> Note an Improvement Idea
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="e.g. Let me pay back a settlement partially"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white/60 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 outline-none text-sm transition-all resize-none placeholder:text-slate-400"
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tag</span>
            {REMARK_TAGS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setTag(current => (current === option ? '' : option))}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                  tag === option
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white/50 text-slate-500 hover:bg-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {openCount} open note{openCount === 1 ? '' : 's'} so far. Manage, tick off or copy them in
            Settings → Improvement Notes.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed disabled:shadow-none"
            >
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
