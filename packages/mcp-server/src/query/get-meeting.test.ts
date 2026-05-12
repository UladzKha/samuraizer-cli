import { describe, it, expect } from 'vitest';
import type { MeetingsStore } from '../lib/meetings-store/types.js';
import type { MeetingOutput } from 'memnex-spec';
import { getMeetingHandler } from './get-meeting.js';

function makeMeeting(overrides: Partial<MeetingOutput> = {}): MeetingOutput {
  return {
    schema_version: '0.2.0',
    meeting_id: '01HXR5K7P8Q3M2N4VWXYZABCDE',
    generated_at: '2026-05-09T10:00:00Z',
    source: {
      file_name: 'meeting.m4a',
      sha256: 'a'.repeat(64),
      format: 'mp4,m4a',
    },
    transcript: {
      language: 'en',
      text: 'Hello',
      segments: [],
    },
    provenance: {
      producer: { name: 'samuraizer', version: '0.2.0' },
      pipeline: {},
    },
    ...overrides,
  } as MeetingOutput;
}

function makeStore(meetings: Map<string, MeetingOutput>): MeetingsStore {
  return {
    list: async () => [],
    get: async (id) => meetings.get(id) ?? null,
  };
}

describe('getMeetingHandler', () => {
  it('returns full meeting JSON for existing id', async () => {
    const meeting = makeMeeting();
    const store = makeStore(new Map([[meeting.meeting_id, meeting]]));
    const result = await getMeetingHandler(store, { id: meeting.meeting_id });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.meeting_id).toBe(meeting.meeting_id);
    expect(parsed.transcript.text).toBe('Hello');
  });

  it('returns isError with descriptive text for unknown id', async () => {
    const store = makeStore(new Map());
    const result = await getMeetingHandler(store, { id: 'does-not-exist' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('does-not-exist');
  });
});
