import { describe, it, expect } from 'vitest';
import type { MeetingsStore, MeetingSummary } from '../lib/meetings-store/types.js';
import { listMeetingsHandler } from './list-meetings.js';

function makeSummary(overrides: Partial<MeetingSummary> = {}): MeetingSummary {
  return {
    id: '01HXR5K7P8Q3M2N4VWXYZABCDE',
    name: '2026-05-09',
    generated_at: '2026-05-09T10:00:00Z',
    summary_preview: '',
    participant_count: 0,
    duration_sec: null,
    ...overrides,
  };
}

function makeStore(summaries: MeetingSummary[]): MeetingsStore {
  return {
    list: async () => summaries,
    get: async () => null,
  };
}

describe('listMeetingsHandler', () => {
  it('returns empty array text for empty store', async () => {
    const result = await listMeetingsHandler(makeStore([]), {});
    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });

  it('returns all summaries when no limit provided', async () => {
    const summaries = [
      makeSummary({ id: 'a', name: 'one' }),
      makeSummary({ id: 'b', name: 'two' }),
    ];
    const result = await listMeetingsHandler(makeStore(summaries), {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('a');
  });

  it('respects limit by truncating from the start', async () => {
    const summaries = [
      makeSummary({ id: 'a', generated_at: '2026-05-09T10:00:00Z' }),
      makeSummary({ id: 'b', generated_at: '2026-03-01T10:00:00Z' }),
      makeSummary({ id: 'c', generated_at: '2026-01-01T10:00:00Z' }),
    ];
    const result = await listMeetingsHandler(makeStore(summaries), { limit: 2 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed.map((m: MeetingSummary) => m.id)).toEqual(['a', 'b']);
  });

  it('returns all when limit exceeds count', async () => {
    const summaries = [makeSummary({ id: 'a' })];
    const result = await listMeetingsHandler(makeStore(summaries), { limit: 100 });
    expect(JSON.parse(result.content[0].text)).toHaveLength(1);
  });
});
