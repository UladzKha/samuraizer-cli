import { describe, it, expect } from 'vitest';
import type { MeetingOutput } from 'memnex-spec';
import type { MeetingRecord, MeetingsStore } from '../lib/meetings-store/types.js';
import { searchMeetingsHandler } from './search-meetings.js';

const SUMMARY_PREVIEW_LENGTH = 200;

function makeRecord(opts: {
  id?: string;
  name?: string;
  generated_at?: string;
  summaryText?: string;
  actionItems?: MeetingOutput['action_items'];
  decisions?: MeetingOutput['decisions'];
}): MeetingRecord {
  const id = opts.id ?? '01HXR5K7P8Q3M2N4VWXYZABCDE';
  const name = opts.name ?? '2026-05-09-standup';
  const generated_at = opts.generated_at ?? '2026-05-09T10:00:00Z';
  const summaryText = opts.summaryText ?? '';

  const document = {
    schema_version: '0.2.0',
    meeting_id: id,
    generated_at,
    source: { file_name: 'meeting.m4a', sha256: 'a'.repeat(64), format: 'mp4,m4a' },
    transcript: { language: 'en', text: 'transcript body', segments: [] },
    ...(summaryText ? { summary: { text: summaryText } } : {}),
    ...(opts.actionItems ? { action_items: opts.actionItems } : {}),
    ...(opts.decisions ? { decisions: opts.decisions } : {}),
    provenance: { producer: { name: 'samuraizer', version: '0.2.0' }, pipeline: {} },
  } as MeetingOutput;

  return {
    summary: {
      id,
      name,
      generated_at,
      // Mirrors FsMeetingsStore: the preview is truncated, the document is not.
      summary_preview: summaryText.slice(0, SUMMARY_PREVIEW_LENGTH),
      participant_count: 0,
      duration_sec: null,
    },
    document,
  };
}

function makeStore(records: MeetingRecord[]): MeetingsStore {
  return {
    list: async () => records.map((r) => r.summary),
    all: async () => records,
    get: async (id) => records.find((r) => r.summary.id === id)?.document ?? null,
  };
}

function parse(text: string): Array<Record<string, unknown>> {
  return JSON.parse(text);
}

describe('searchMeetingsHandler', () => {
  it('rejects a blank query', async () => {
    const result = await searchMeetingsHandler(makeStore([]), { query: '   ' });
    expect(result.isError).toBe(true);
  });

  it('reports no match without erroring when nothing is found', async () => {
    const store = makeStore([makeRecord({ summaryText: 'we talked about budgets' })]);
    const result = await searchMeetingsHandler(store, { query: 'kubernetes' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('No meetings found');
  });

  it('finds a term past the 200-character summary preview cutoff', async () => {
    const summaryText = `${'filler word '.repeat(40)}the patient id was verified`;
    expect(summaryText.length).toBeGreaterThan(SUMMARY_PREVIEW_LENGTH);

    const store = makeStore([makeRecord({ summaryText })]);
    const result = await searchMeetingsHandler(store, { query: 'patient id' });

    const parsed = parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].matched_in).toEqual(['summary']);
    expect(parsed[0].snippet).toContain('patient id');
  });

  it('searches action items, including assignee and due date', async () => {
    const store = makeStore([
      makeRecord({
        id: 'a',
        summaryText: 'nothing relevant here',
        actionItems: [{ id: 'act_0001', text: 'ship the migration', assignee: 'Marta', due_date: 'next Friday' }],
      }),
    ]);

    for (const query of ['ship the migration', 'marta', 'next friday']) {
      const result = await searchMeetingsHandler(store, { query });
      const parsed = parse(result.content[0].text);
      expect(parsed, `query: ${query}`).toHaveLength(1);
      expect(parsed[0].matched_in).toEqual(['action_items']);
    }
  });

  it('searches decisions, including context', async () => {
    const store = makeStore([
      makeRecord({
        id: 'a',
        decisions: [{ id: 'dec_0001', text: 'drop the legacy exporter', context: 'nobody uses it since Q1' }],
      }),
    ]);

    const result = await searchMeetingsHandler(store, { query: 'legacy exporter' });
    const parsed = parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].matched_in).toEqual(['decisions']);
  });

  it('is case-insensitive and matches the folder name', async () => {
    const store = makeStore([makeRecord({ name: '2026-05-09-Retro' })]);
    const result = await searchMeetingsHandler(store, { query: 'RETRO' });
    const parsed = parse(result.content[0].text);
    expect(parsed[0].matched_in).toEqual(['name']);
  });

  it('ranks multi-field matches above single-field matches', async () => {
    const store = makeStore([
      makeRecord({ id: 'only-name', name: 'exporter-sync', generated_at: '2026-05-09T10:00:00Z' }),
      makeRecord({
        id: 'name-and-summary',
        name: 'exporter-review',
        generated_at: '2026-05-08T10:00:00Z',
        summaryText: 'we agreed to rewrite the exporter',
      }),
    ]);

    const result = await searchMeetingsHandler(store, { query: 'exporter' });
    const parsed = parse(result.content[0].text);
    expect(parsed.map((r) => r.id)).toEqual(['name-and-summary', 'only-name']);
    expect(parsed[0].score).toBe(5);
    expect(parsed[0].matched_in).toEqual(['summary', 'name']);
  });

  it('breaks score ties by generated_at descending', async () => {
    const store = makeStore([
      makeRecord({ id: 'older', name: 'sync', generated_at: '2026-01-01T10:00:00Z' }),
      makeRecord({ id: 'newer', name: 'sync', generated_at: '2026-06-01T10:00:00Z' }),
    ]);

    const result = await searchMeetingsHandler(store, { query: 'sync' });
    expect(parse(result.content[0].text).map((r) => r.id)).toEqual(['newer', 'older']);
  });

  it('applies the limit, defaulting to 10', async () => {
    const records = Array.from({ length: 12 }, (_, i) =>
      makeRecord({ id: `m${i}`, name: `sync-${i}`, generated_at: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z` }),
    );
    const store = makeStore(records);

    const defaulted = await searchMeetingsHandler(store, { query: 'sync' });
    expect(parse(defaulted.content[0].text)).toHaveLength(10);

    const limited = await searchMeetingsHandler(store, { query: 'sync', limit: 3 });
    expect(parse(limited.content[0].text)).toHaveLength(3);
  });

  it('does not search the transcript', async () => {
    const store = makeStore([makeRecord({ summaryText: 'unrelated' })]);
    const result = await searchMeetingsHandler(store, { query: 'transcript body' });
    expect(result.content[0].text).toContain('No meetings found');
  });

  it('falls back to the preview when the document carries no summary', async () => {
    const record = makeRecord({ id: 'a', name: 'sync' });
    record.summary.summary_preview = 'preview-only text about invoices';
    const result = await searchMeetingsHandler(makeStore([record]), { query: 'invoices' });
    expect(parse(result.content[0].text)[0].matched_in).toEqual(['summary']);
  });
});
