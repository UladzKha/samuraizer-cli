import { describe, it, expect } from 'vitest';
import type { MeetingsStore, MeetingSummary } from '../lib/meetings-store/types.js';
import type { MeetingOutput } from '@samuraizer/schema';
import { listMeetingResources, readMeetingResource } from './meeting-resource.js';

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

function makeMeeting(id: string): MeetingOutput {
  return {
    schema_version: '0.1.0',
    meeting_id: id,
    generated_at: '2026-05-09T10:00:00Z',
    source: {
      file_name: 'meeting.m4a',
      sha256: 'a'.repeat(64),
      format: 'mp4,m4a',
    },
    transcript: { language: 'en', text: 'Hello', segments: [] },
    provenance: {
      producer: { name: 'samuraizer', version: '0.2.0' },
      pipeline: {},
    },
  } as MeetingOutput;
}

function makeStore(opts: {
  summaries?: MeetingSummary[];
  meetings?: Map<string, MeetingOutput>;
}): MeetingsStore {
  return {
    list: async () => opts.summaries ?? [],
    get: async (id) => opts.meetings?.get(id) ?? null,
  };
}

describe('listMeetingResources', () => {
  it('returns empty list for empty store', async () => {
    const result = await listMeetingResources(makeStore({}));
    expect(result.resources).toEqual([]);
  });

  it('produces meeting:// URIs from summaries', async () => {
    const summaries = [
      makeSummary({ id: 'abc', name: 'team-sync', summary_preview: 'Quarterly review' }),
    ];
    const result = await listMeetingResources(makeStore({ summaries }));
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].uri).toBe('meeting://abc');
    expect(result.resources[0].name).toBe('team-sync');
    expect(result.resources[0].description).toContain('Quarterly review');
    expect(result.resources[0].mimeType).toBe('application/json');
  });

  it('omits preview separator when summary_preview is empty', async () => {
    const summaries = [makeSummary({ id: 'abc', summary_preview: '' })];
    const result = await listMeetingResources(makeStore({ summaries }));
    expect(result.resources[0].description).not.toContain(' — ');
  });
});

describe('readMeetingResource', () => {
  it('returns full meeting.json for existing id', async () => {
    const meeting = makeMeeting('xyz');
    const store = makeStore({ meetings: new Map([['xyz', meeting]]) });
    const uri = new URL('meeting://xyz');
    const result = await readMeetingResource(store, uri, 'xyz');
    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].uri).toBe('meeting://xyz');
    expect(result.contents[0].mimeType).toBe('application/json');
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.meeting_id).toBe('xyz');
  });

  it('throws for unknown id', async () => {
    const store = makeStore({});
    const uri = new URL('meeting://nope');
    await expect(readMeetingResource(store, uri, 'nope')).rejects.toThrow('nope');
  });
});
