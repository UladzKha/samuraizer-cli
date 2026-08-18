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

/**
 * Rank bonus that makes a snippet anchored on the whole phrase win over one
 * anchored on a single term, regardless of which field each was found in.
 * Only affects which excerpt is shown, never whether a meeting matches.
 */
const PHRASE_SNIPPET_BOOST = 100;

type Haystack = { label: string; text: string; weight: number };

export type ParsedQuery = {
  /** Every term that must be present somewhere for a meeting to match. */
  terms: string[];
  /**
   * The whole query as one string, scored as a bonus when it appears verbatim.
   * Null for single-term queries, where it would double-count the only term.
   */
  phrase: string | null;
};

/**
 * Split a raw query into search terms.
 *
 * Bare words are separate terms; a "quoted run" stays a single term, which is
 * how a caller asks for an exact phrase and nothing looser.
 */
export function parseQuery(raw: string): ParsedQuery {
  const normalized = raw.trim().toLowerCase();
  const terms: string[] = [];

  for (const match of normalized.matchAll(/"([^"]+)"|(\S+)/g)) {
    const term = (match[1] ?? match[2] ?? '').trim();
    if (term.length > 0 && !terms.includes(term)) terms.push(term);
  }

  const phrase = normalized.replace(/"/g, '').replace(/\s+/g, ' ').trim();

  return { terms, phrase: terms.length > 1 ? phrase : null };
}

/**
 * Handler for the `search_meetings` MCP tool.
 *
 * Searches the full summary text, meeting name, action items, and decisions.
 * Returns ranked results with a snippet around the best match.
 *
 * The query is tokenised, and a meeting matches only when *every* term appears
 * somewhere in those fields — terms need not share a field, so "patient id post
 * log" finds a meeting whose summary mentions the patient ID and whose action
 * items mention the post log. Matching a term is still substring-based, so
 * "exporter" finds "exporters". A caller who wants the old strict behaviour can
 * quote the query.
 *
 * Ranking sums the weight of each field a term was found in, so a term hitting
 * several fields outranks one hitting a single field. A verbatim hit on the
 * whole phrase scores once more on top, keeping exact matches above meetings
 * that merely scatter the same words.
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
  const { terms, phrase } = parseQuery(input.query);
  if (terms.length === 0) {
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
    const foundTerms = new Set<string>();
    let score = 0;
    let bestSnippet = '';
    let bestRank = -1;

    // Fields outside, terms inside, so matched_in always follows field order
    // rather than the order the caller happened to type the words in.
    for (const { label, text, weight } of buildHaystacks(record)) {
      const haystack = text.toLowerCase();
      let fieldMatched = false;

      for (const term of terms) {
        const idx = haystack.indexOf(term);
        if (idx === -1) continue;

        foundTerms.add(term);
        score += weight;
        fieldMatched = true;

        if (weight > bestRank) {
          bestRank = weight;
          bestSnippet = buildSnippet(text, idx, term.length);
        }
      }

      if (phrase !== null) {
        const idx = haystack.indexOf(phrase);
        if (idx !== -1) {
          score += weight;
          fieldMatched = true;

          const rank = weight + PHRASE_SNIPPET_BOOST;
          if (rank > bestRank) {
            bestRank = rank;
            bestSnippet = buildSnippet(text, idx, phrase.length);
          }
        }
      }

      if (fieldMatched) matched.push(label);
    }

    // Every term must have landed somewhere; a meeting carrying only some of
    // them is not what the caller asked for.
    if (foundTerms.size === terms.length) {
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

/** Excerpt around a match, with ellipses where the field was cut. */
function buildSnippet(text: string, idx: number, matchLength: number): string {
  const start = Math.max(0, idx - SNIPPET_CONTEXT);
  const end = Math.min(text.length, idx + matchLength + SNIPPET_CONTEXT);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

/**
 * One searchable text blob per field group. Each group is matched at most
 * once per term, so a term repeated inside a group does not outrank a term
 * that appears in several groups.
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
