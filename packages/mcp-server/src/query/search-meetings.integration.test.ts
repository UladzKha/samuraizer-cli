import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FsMeetingsStore } from '../lib/meetings-store/fs-store.js';
import { searchMeetingsHandler } from './search-meetings.js';

/**
 * search_meetings against the real filesystem store.
 *
 * The unit tests drive the handler with a fake store; this one checks the wiring
 * that the fake cannot: that the handler reads full documents (via all()) rather
 * than the truncated summary_preview that list() carries.
 */

let workDir: string;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), 'samuraizer-search-'));
  stderrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  stderrSpy.mockRestore();
  await rm(workDir, { recursive: true, force: true });
});

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `01HXR5K7P8Q3M2N4VWXYZAB${String(idCounter).padStart(3, '0')}`;
}

async function writeMeeting(folderName: string, overrides: Record<string, unknown>): Promise<void> {
  const folder = path.join(workDir, folderName);
  await mkdir(folder, { recursive: true });
  const document = {
    schema_version: '0.2.0',
    meeting_id: nextId(),
    generated_at: '2026-05-09T10:00:00Z',
    source: { file_name: 'meeting.m4a', sha256: 'a'.repeat(64), format: 'mp4,m4a' },
    transcript: { language: 'en', text: 'a long transcript mentioning quarterly forecasts', segments: [] },
    provenance: { producer: { name: 'samuraizer', version: '0.2.0' }, pipeline: {} },
    ...overrides,
  };
  await writeFile(path.join(folder, 'meeting.json'), JSON.stringify(document), 'utf8');
}

function parse(text: string): Array<Record<string, any>> {
  return JSON.parse(text);
}

describe('search_meetings over FsMeetingsStore', () => {
  it('matches text deep inside the summary, not just the first 200 characters', async () => {
    const buried = `${'Routine status updates and scheduling chatter. '.repeat(8)}Boris raised the patient ID mismatch.`;
    expect(buried.indexOf('patient ID')).toBeGreaterThan(200);

    await writeMeeting('2026-05-09-standup', { summary: { text: buried } });

    const store = new FsMeetingsStore(workDir);
    const result = await searchMeetingsHandler(store, { query: 'patient id' });

    const parsed = parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('2026-05-09-standup');
    expect(parsed[0].matched_in).toContain('summary');
    expect(parsed[0].snippet).toContain('patient ID');
  });

  it('matches action items and decisions written by the pipeline', async () => {
    await writeMeeting('2026-05-10-planning', {
      summary: { text: 'Short summary.' },
      action_items: [
        { id: 'act_1', text: 'Rotate the signing keys', assignee: 'Carla', due_date: 'next Tuesday', due_date_iso: null },
      ],
      decisions: [{ id: 'dec_1', text: 'Adopt the new retention policy', context: null }],
    });

    const store = new FsMeetingsStore(workDir);

    const byAction = await searchMeetingsHandler(store, { query: 'signing keys' });
    expect(parse(byAction.content[0].text)[0].matched_in).toContain('action_items');

    const byDecision = await searchMeetingsHandler(store, { query: 'retention policy' });
    expect(parse(byDecision.content[0].text)[0].matched_in).toContain('decisions');
  });

  it('reports no match for transcript-only terms rather than pretending to search them', async () => {
    await writeMeeting('2026-05-11-sync', { summary: { text: 'Short summary.' } });

    const store = new FsMeetingsStore(workDir);
    const result = await searchMeetingsHandler(store, { query: 'quarterly forecasts' });

    expect(result.content[0].text).toContain('No meetings found');
  });

  it('ignores folders that are not valid meetings', async () => {
    await mkdir(path.join(workDir, 'not-a-meeting'), { recursive: true });
    await writeFile(path.join(workDir, 'not-a-meeting', 'notes.txt'), 'signing keys', 'utf8');
    await writeMeeting('2026-05-12-real', { summary: { text: 'about signing keys' } });

    const store = new FsMeetingsStore(workDir);
    const result = await searchMeetingsHandler(store, { query: 'signing keys' });

    const parsed = parse(result.content[0].text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe('2026-05-12-real');
  });

  it('returns nothing, without erroring, for an empty meetings directory', async () => {
    const store = new FsMeetingsStore(path.join(workDir, 'nope'));
    const result = await searchMeetingsHandler(store, { query: 'anything' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('No meetings found');
  });
});
