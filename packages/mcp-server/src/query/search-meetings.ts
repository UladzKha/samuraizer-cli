import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MeetingRecord, MeetingsStore } from '../lib/meetings-store/types.js';

export interface SearchMeetingsInput {
  query: string;
  limit?: number;
}

interface SearchResult {
  id: string;
  name: string;
  generated_at: string;
  duration_sec: number | null;
  score: number;
  matched_in: string[];
  snippet: string;
}

/** Characters of context kept on each side of a match in the snippet. */
const SNIPPET_CONTEXT = 50;

type Haystack = { label: string; text: string; weight: number };

/**
 * Handler for the `search_meetings` MCP tool.
 *
 * Searches the full summary text, meeting name, action items, and decisions.
 * Returns ranked results with a snippet around the best match.
 *
 * Deliberately does NOT search the transcript: transcripts are one to two
 * orders of magnitude larger than the fields above, and scanning them for
 * every meeting on every query would make the tool unusable on a large
 * meetings directory. get_meeting returns the transcript when it is needed.
 */
export async function searchMeetingsHandler(
  store: MeetingsStore,
  input: SearchMeetingsInput,
): Promise<CallToolResult> {
  const query = input.query.trim().toLowerCase();
  if (!query) {
    return {
      content: [{ type: 'text', text: 'Query must not be empty.' }],
      isError: true,
    };
  }

  const records = await store.all();
  const limit = input.limit ?? 10;
  const results: SearchResult[] = [];

  for (const record of records) {
    const matched: string[] = [];
    let score = 0;
    let bestSnippet = '';
    let bestWeight = 0;

    for (const { label, text, weight } of buildHaystacks(record)) {
      const idx = text.toLowerCase().indexOf(query);
      if (idx === -1) continue;

      matched.push(label);
      score += weight;

      const start = Math.max(0, idx - SNIPPET_CONTEXT);
      const end = Math.min(text.length, idx + query.length + SNIPPET_CONTEXT);
      const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
      if (weight > bestWeight) {
        bestWeight = weight;
        bestSnippet = snippet;
      }
    }

    if (matched.length > 0) {
      results.push({
        id: record.summary.id,
        name: record.summary.name,
        generated_at: record.summary.generated_at,
        duration_sec: record.summary.duration_sec,
        score,
        matched_in: matched,
        snippet: bestSnippet,
      });
    }
  }

  // Sort by score descending, then by generated_at descending
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.generated_at.localeCompare(a.generated_at);
  });

  const limited = results.slice(0, limit);

  if (limited.length === 0) {
    return {
      content: [{ type: 'text', text: `No meetings found matching "${input.query}".` }],
    };
  }

  return {
    content: [{ type: 'text', text: JSON.stringify(limited, null, 2) }],
  };
}

/**
 * One searchable text blob per field group. Each group is matched at most
 * once, so a term repeated inside a group does not outrank a term that
 * appears in several groups.
 */
function buildHaystacks({ summary, document }: MeetingRecord): Haystack[] {
  const haystacks: Haystack[] = [];

  const summaryText = document.summary?.text ?? summary.summary_preview;
  if (summaryText) {
    haystacks.push({ label: 'summary', text: summaryText, weight: 3 });
  }

  haystacks.push({ label: 'name', text: summary.name, weight: 2 });

  const actionItems = (document.action_items ?? [])
    .map((item) => [item.text, item.assignee, item.due_date].filter(Boolean).join(' — '))
    .join('\n');
  if (actionItems) {
    haystacks.push({ label: 'action_items', text: actionItems, weight: 2 });
  }

  const decisions = (document.decisions ?? [])
    .map((item) => [item.text, item.context].filter(Boolean).join(' — '))
    .join('\n');
  if (decisions) {
    haystacks.push({ label: 'decisions', text: decisions, weight: 2 });
  }

  return haystacks;
}
