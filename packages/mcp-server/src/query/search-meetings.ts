import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MeetingsStore, MeetingSummary } from '../lib/meetings-store/types.js';

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

/**
 * Handler for the `search_meetings` MCP tool.
 *
 * Full-text search across summary, action items, decisions, and meeting name.
 * Returns ranked results with a snippet around the best match.
 *
 * v1: searches summary (full text), action items, decisions, and name.
 * v2: add transcript search (requires meetingsDir or store change).
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

  const summaries = await store.list();
  const limit = input.limit ?? 10;
  const results: SearchResult[] = [];

  for (const s of summaries) {
    const matched: string[] = [];
    let score = 0;
    let bestSnippet = '';
    let bestWeight = 0;

    // Build haystacks from available fields
    const haystacks: Array<{ label: string; text: string; weight: number }> = [];

    if (s.summary_preview) {
      haystacks.push({ label: 'summary', text: s.summary_preview, weight: 3 });
    }
    haystacks.push({ label: 'name', text: s.name, weight: 2 });

    for (const { label, text, weight } of haystacks) {
      const lower = text.toLowerCase();
      const idx = lower.indexOf(query);
      if (idx !== -1) {
        matched.push(label);
        score += weight;
        // Extract snippet around the match
        const start = Math.max(0, idx - 50);
        const end = Math.min(text.length, idx + query.length + 50);
        const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
        if (weight > bestWeight) {
          bestWeight = weight;
          bestSnippet = snippet;
        }
      }
    }

    if (matched.length > 0) {
      results.push({
        id: s.id,
        name: s.name,
        generated_at: s.generated_at,
        duration_sec: s.duration_sec,
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
