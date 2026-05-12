import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FsMeetingsStore } from './fs-store.js';

let workDir: string;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'samuraizer-fs-store-'));
  stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  stderrSpy.mockRestore();
  await rm(workDir, { recursive: true, force: true });
});

/** Build a minimal valid MeetingOutput with overrides. */
function buildMeeting(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schema_version: '0.1.0',
    meeting_id: '01HXR5K7P8Q3M2N4VWXYZABCDE',
    generated_at: '2026-05-09T10:00:00Z',
    source: {
      file_name: 'meeting.m4a',
      sha256: 'a'.repeat(64),
      format: 'mp4,m4a',
    },
    transcript: {
      language: 'en',
      text: 'Hello world',
      segments: [],
    },
    provenance: {
      producer: { name: 'samuraizer', version: '0.2.0' },
      pipeline: {},
    },
    ...overrides,
  };
}

async function createMeetingFolder(
  parent: string,
  folderName: string,
  meetingJson: unknown | string,
): Promise<void> {
  const folder = path.join(parent, folderName);
  await mkdir(folder, { recursive: true });
  const content = typeof meetingJson === 'string' ? meetingJson : JSON.stringify(meetingJson);
  await writeFile(path.join(folder, 'meeting.json'), content, 'utf8');
}

describe('FsMeetingsStore.list', () => {
  it('returns empty array for empty meetingsDir', async () => {
    const store = new FsMeetingsStore(workDir);
    expect(await store.list()).toEqual([]);
  });

  it('returns empty array for non-existent meetingsDir', async () => {
    const store = new FsMeetingsStore(path.join(workDir, 'does-not-exist'));
    expect(await store.list()).toEqual([]);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('skips folders without meeting.json silently', async () => {
    await mkdir(path.join(workDir, 'random-folder'), { recursive: true });
    const store = new FsMeetingsStore(workDir);
    expect(await store.list()).toEqual([]);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('returns one summary for one valid meeting', async () => {
    await createMeetingFolder(workDir, '2026-05-09', buildMeeting());
    const store = new FsMeetingsStore(workDir);
    const result = await store.list();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: '01HXR5K7P8Q3M2N4VWXYZABCDE',
      name: '2026-05-09',
      generated_at: '2026-05-09T10:00:00Z',
      participant_count: 0,
      duration_sec: null,
    });
  });

  it('truncates summary_preview to 200 characters', async () => {
    const longSummary = 'x'.repeat(500);
    await createMeetingFolder(workDir, 'long', buildMeeting({
      summary: { text: longSummary },
    }));
    const store = new FsMeetingsStore(workDir);
    const result = await store.list();
    expect(result[0].summary_preview).toHaveLength(200);
  });

  it('extracts participant_count and duration_sec', async () => {
    await createMeetingFolder(workDir, 'rich', buildMeeting({
      participants: [
        { id: 'p_0001', name: 'Alice' },
        { id: 'p_0002', name: 'Bob' },
      ],
      source: {
        file_name: 'meeting.m4a',
        sha256: 'a'.repeat(64),
        format: 'mp4,m4a',
        duration_sec: 1800,
      },
    }));
    const store = new FsMeetingsStore(workDir);
    const result = await store.list();
    expect(result[0].participant_count).toBe(2);
    expect(result[0].duration_sec).toBe(1800);
  });

  it('skips invalid meeting.json with stderr warning', async () => {
    await createMeetingFolder(workDir, 'bad-schema', buildMeeting({
      meeting_id: '', // violates minLength: 1
    }));
    const store = new FsMeetingsStore(workDir);
    expect(await store.list()).toEqual([]);
    expect(stderrSpy).toHaveBeenCalled();
    const logCall = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(logCall.event).toBe('invalid_meeting_skipped');
    expect(logCall.reason).toBe('schema_validation_failed');
  });

  it('skips malformed JSON with stderr warning', async () => {
    await createMeetingFolder(workDir, 'bad-json', '{not json');
    const store = new FsMeetingsStore(workDir);
    expect(await store.list()).toEqual([]);
    expect(stderrSpy).toHaveBeenCalled();
    const logCall = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(logCall.reason).toBe('json_parse_failed');
  });

  it('sorts by generated_at descending', async () => {
    await createMeetingFolder(workDir, 'old', buildMeeting({
      meeting_id: '01HXR5K7P8Q3M2N4VWXYZABCD01',
      generated_at: '2026-01-01T10:00:00Z',
    }));
    await createMeetingFolder(workDir, 'new', buildMeeting({
      meeting_id: '01HXR5K7P8Q3M2N4VWXYZABCD02',
      generated_at: '2026-05-09T10:00:00Z',
    }));
    await createMeetingFolder(workDir, 'middle', buildMeeting({
      meeting_id: '01HXR5K7P8Q3M2N4VWXYZABCD03',
      generated_at: '2026-03-15T10:00:00Z',
    }));
    const store = new FsMeetingsStore(workDir);
    const result = await store.list();
    expect(result.map(m => m.name)).toEqual(['new', 'middle', 'old']);
  });
});

describe('FsMeetingsStore.get', () => {
  it('returns null for non-existent id', async () => {
    const store = new FsMeetingsStore(workDir);
    expect(await store.get('01HXR5K7P8Q3M2N4VWXYZABCDE')).toBeNull();
  });

  it('returns full document for existing id', async () => {
    await createMeetingFolder(workDir, '2026-05-09', buildMeeting());
    const store = new FsMeetingsStore(workDir);
    const result = await store.get('01HXR5K7P8Q3M2N4VWXYZABCDE');
    expect(result).not.toBeNull();
    expect(result?.meeting_id).toBe('01HXR5K7P8Q3M2N4VWXYZABCDE');
    expect(result?.transcript.text).toBe('Hello world');
  });

  it('returns null when matching folder has invalid meeting.json', async () => {
    await createMeetingFolder(workDir, 'bad', buildMeeting({ meeting_id: '' }));
    const store = new FsMeetingsStore(workDir);
    expect(await store.get('01HXR5K7P8Q3M2N4VWXYZABCDE')).toBeNull();
  });
});
