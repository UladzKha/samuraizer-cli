import type { MeetingOutput } from 'memnex-spec';

/**
 * Lightweight summary of a meeting, suitable for list views.
 * Designed to be cheap to produce — readable from a single meeting.json
 * pass without loading transcript or other heavy fields.
 */
export interface MeetingSummary {
  /** ULID from meeting.json:meeting_id. Primary identifier. */
  id: string;
  /** Folder name on disk. Human-readable but not unique. */
  name: string;
  /** ISO 8601 timestamp from meeting.json:generated_at. */
  generated_at: string;
  /** First 200 characters of summary.text, or empty string if absent. */
  summary_preview: string;
  /** participants.length, or 0 if absent. */
  participant_count: number;
  /** source.duration_sec, or null if not set. */
  duration_sec: number | null;
}

/**
 * Read-only access to a collection of processed meetings.
 *
 * v0.1 has a single filesystem-scan implementation (FsMeetingsStore).
 * v0.2+ may add SQLite-backed or remote implementations; the interface
 * is designed so query-mode tools depend only on this contract.
 */
export interface MeetingsStore {
  /**
   * Return all meetings, sorted by generated_at descending (newest first).
   * Invalid or unreadable entries are silently skipped (warnings go to stderr).
   */
  list(): Promise<MeetingSummary[]>;

  /**
   * Return the full meeting document by id, or null if not found
   * or invalid. Same skip semantics as list().
   */
  get(id: string): Promise<MeetingOutput | null>;
}
