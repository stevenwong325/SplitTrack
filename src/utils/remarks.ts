import type { Remark, RemarkStatus, RemarkTag } from '../types';

export const REMARK_TAGS: RemarkTag[] = ['Bug', 'UX', 'Feature', 'Idea'];

export interface RemarkFilters {
  status?: 'all' | RemarkStatus;
  tag?: 'all' | RemarkTag;
  query?: string;
}

export function createRemark(text: string, tag?: RemarkTag): Remark {
  const remark: Remark = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    status: 'open',
  };
  if (tag) remark.tag = tag;
  return remark;
}

/** Open notes first, newest first inside each group. */
export function sortRemarks(remarks: Remark[]): Remark[] {
  return [...remarks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterRemarks(remarks: Remark[], filters: RemarkFilters = {}): Remark[] {
  const status = filters.status ?? 'all';
  const tag = filters.tag ?? 'all';
  const query = (filters.query ?? '').trim().toLowerCase();

  return remarks.filter(remark => {
    if (status !== 'all' && remark.status !== status) return false;
    if (tag !== 'all' && remark.tag !== tag) return false;
    if (query && !remark.text.toLowerCase().includes(query)) return false;
    return true;
  });
}

export function countOpenRemarks(remarks: Remark[]): number {
  return remarks.filter(remark => remark.status === 'open').length;
}

/** Cycles No tag → Bug → UX → Feature → Idea → No tag. */
export function nextRemarkTag(current?: RemarkTag): RemarkTag | undefined {
  const nextIndex = REMARK_TAGS.indexOf(current as RemarkTag) + 1;
  return nextIndex < REMARK_TAGS.length ? REMARK_TAGS[nextIndex] : undefined;
}

/** Markdown checklist, handy for pasting notes into a chat or a ticket. */
export function remarksToMarkdown(remarks: Remark[]): string {
  const sorted = sortRemarks(remarks);
  const header = '# SplitTrack improvement notes';
  if (sorted.length === 0) return `${header}\n\n_No notes yet._\n`;

  const lines = sorted.map(remark => {
    const box = remark.status === 'done' ? '[x]' : '[ ]';
    const tag = remark.tag ? ` (${remark.tag})` : '';
    const date = remark.createdAt.slice(0, 10);
    return `- ${box}${tag} ${date} — ${remark.text}`;
  });

  return [header, '', ...lines, ''].join('\n');
}

/** Defensive parser for imported/untrusted remark arrays. */
export function normalizeRemark(value: unknown): Remark | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<Remark>;
  if (typeof raw.text !== 'string' || raw.text.trim() === '') return null;

  const tag = REMARK_TAGS.includes(raw.tag as RemarkTag) ? (raw.tag as RemarkTag) : undefined;

  const remark: Remark = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: raw.text.trim(),
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : new Date().toISOString(),
    status: raw.status === 'done' ? 'done' : 'open',
  };
  if (tag) remark.tag = tag;
  return remark;
}

/** Parses an untrusted list (e.g. from a backup file) into valid remarks. */
export function normalizeRemarkList(value: unknown): Remark[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeRemark)
    .filter((remark): remark is Remark => remark !== null);
}
