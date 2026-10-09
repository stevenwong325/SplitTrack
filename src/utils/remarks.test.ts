import { describe, expect, it } from 'vitest';
import type { Remark } from '../types';
import {
  countOpenRemarks,
  createRemark,
  filterRemarks,
  normalizeRemark,
  normalizeRemarkList,
  nextRemarkTag,
  remarksToMarkdown,
  sortRemarks,
} from './remarks';

function remark(overrides: Partial<Remark> = {}): Remark {
  return {
    id: 'r-1',
    text: 'Add partial settlement',
    createdAt: '2026-10-01T10:00:00.000Z',
    status: 'open',
    ...overrides,
  };
}

describe('remark helpers', () => {
  it('creates a trimmed, open remark with a generated id', () => {
    const created = createRemark('   Rethink the Splits tab   ', 'UX');
    expect(created.text).toBe('Rethink the Splits tab');
    expect(created.status).toBe('open');
    expect(created.tag).toBe('UX');
    expect(created.id).toMatch(/^r-/);
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false);
  });

  it('omits the tag when none is provided', () => {
    expect(createRemark('Plain note').tag).toBeUndefined();
  });

  it('sorts open notes first and newest first within a group', () => {
    const sorted = sortRemarks([
      remark({ id: 'old-open', createdAt: '2026-09-01T10:00:00.000Z' }),
      remark({ id: 'new-done', status: 'done', createdAt: '2026-10-05T10:00:00.000Z' }),
      remark({ id: 'new-open', createdAt: '2026-10-04T10:00:00.000Z' }),
    ]);

    expect(sorted.map(r => r.id)).toEqual(['new-open', 'old-open', 'new-done']);
  });

  it('filters by status, tag and free text search', () => {
    const notes = [
      remark({ id: 'a', text: 'Dark mode', tag: 'UX' }),
      remark({ id: 'b', text: 'Rounding bug', tag: 'Bug', status: 'done' }),
      remark({ id: 'c', text: 'Export reminders' }),
    ];

    expect(filterRemarks(notes, { status: 'open' }).map(r => r.id)).toEqual(['a', 'c']);
    expect(filterRemarks(notes, { tag: 'Bug' }).map(r => r.id)).toEqual(['b']);
    expect(filterRemarks(notes, { query: 'DARK' }).map(r => r.id)).toEqual(['a']);
    expect(filterRemarks(notes).map(r => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('counts only open notes', () => {
    expect(countOpenRemarks([
      remark({ id: 'a' }),
      remark({ id: 'b', status: 'done' }),
      remark({ id: 'c' }),
    ])).toBe(2);
  });

  it('cycles through tags and wraps back to no tag', () => {
    expect(nextRemarkTag()).toBe('Bug');
    expect(nextRemarkTag('Bug')).toBe('UX');
    expect(nextRemarkTag('Idea')).toBeUndefined();
  });

  it('renders a markdown checklist with tags and dates', () => {
    const markdown = remarksToMarkdown([
      remark({ id: 'a', text: 'Split payments', tag: 'Feature', createdAt: '2026-10-04T10:00:00.000Z' }),
      remark({ id: 'b', text: 'Fixed typo', status: 'done', createdAt: '2026-10-02T10:00:00.000Z' }),
    ]);

    expect(markdown).toContain('- [ ] (Feature) 2026-10-04 — Split payments');
    expect(markdown).toContain('- [x] 2026-10-02 — Fixed typo');
  });

  it('renders a placeholder when there are no notes', () => {
    expect(remarksToMarkdown([])).toContain('_No notes yet._');
  });

  it('rejects malformed remarks while normalizing imports', () => {
    expect(normalizeRemark(null)).toBeNull();
    expect(normalizeRemark({ text: '   ' })).toBeNull();
    expect(normalizeRemark('just a string')).toBeNull();

    expect(normalizeRemark({ text: ' Keep me ', status: 'weird', tag: 'Nope' })).toEqual({
      id: expect.any(String),
      text: 'Keep me',
      createdAt: expect.any(String),
      status: 'open',
    });

    expect(normalizeRemarkList([{ text: 'one' }, null, { text: '' }])).toHaveLength(1);
    expect(normalizeRemarkList('not-an-array')).toEqual([]);
  });
});
