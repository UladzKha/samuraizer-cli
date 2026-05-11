/**
 * Filesystem-scan implementation of MeetingsStore.
 *
 * v0.1: every list()/get() call performs a fresh scan of meetingsDir.
 * No caching by design — keeps the implementation small and avoids
 * stale-cache bugs. v0.2 plans to introduce a SQLite-backed store
 * with mtime-based invalidation; until then, prefer correctness over
 * performance.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { validate } from 'memnex-spec';
import type { MeetingOutput } from 'memnex-spec';
import type { MeetingsStore, MeetingSummary } from './types.js';

const SUMMARY_PREVIEW_LENGTH = 200;

interface ScannedMeeting {
  folderName: string;
  document: MeetingOutput;
}

export class FsMeetingsStore implements MeetingsStore {
  constructor(private readonly meetingsDir: string) {}

  async list(): Promise<MeetingSummary[]> {
    const scanned = await this.scanAll();
    return scanned
      .map(({ folderName, document }) => toSummary(folderName, document))
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  }

  async get(id: string): Promise<MeetingOutput | null> {
    const scanned = await this.scanAll();
    const match = scanned.find(({ document }) => document.meeting_id === id);
    return match ? match.document : null;
  }

  private async scanAll(): Promise<ScannedMeeting[]> {
    let entries: string[];
    try {
      entries = await readdir(this.meetingsDir);
    } catch (err) {
      logWarn('meetings_dir_unreadable', this.meetingsDir, err);
      return [];
    }

    const results: ScannedMeeting[] = [];
    for (const entry of entries) {
      const folderPath = path.join(this.meetingsDir, entry);
      const meetingJsonPath = path.join(folderPath, 'meeting.json');

      let isDir = false;
      try {
        const st = await stat(folderPath);
        isDir = st.isDirectory();
      } catch {
        continue; // entry vanished between readdir and stat
      }
      if (!isDir) continue;

      let raw: string;
      try {
        raw = await readFile(meetingJsonPath, 'utf8');
      } catch {
        continue; // no meeting.json — silently skip, not a meeting folder
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        logWarn('invalid_meeting_skipped', meetingJsonPath, err, 'json_parse_failed');
        continue;
      }

      const result = validate(parsed);
      if (!result.valid) {
        logWarn('invalid_meeting_skipped', meetingJsonPath, result.errors, 'schema_validation_failed');
        continue;
      }

      results.push({ folderName: entry, document: result.data });
    }

    return results;
  }
}

function toSummary(folderName: string, doc: MeetingOutput): MeetingSummary {
  const summaryText = doc.summary?.text ?? '';
  return {
    id: doc.meeting_id,
    name: folderName,
    generated_at: doc.generated_at,
    summary_preview: summaryText.slice(0, SUMMARY_PREVIEW_LENGTH),
    participant_count: doc.participants?.length ?? 0,
    duration_sec: doc.source.duration_sec ?? null,
  };
}

function logWarn(event: string, target: string, detail: unknown, reason?: string): void {
  // MCP servers must keep stdout clean for JSON-RPC; logs go to stderr.
  // Structured JSON line keeps logs greppable in Claude Desktop's log files.
  console.error(JSON.stringify({
    level: 'warn',
    event,
    path: target,
    reason,
    detail: detail instanceof Error ? detail.message : detail,
    timestamp: new Date().toISOString(),
  }));
}
