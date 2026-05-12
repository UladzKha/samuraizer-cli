import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MeetingsStore, MeetingSummary } from '../lib/meetings-store/types.js';

export interface ListMeetingsInput {
  limit?: number;
}

/**
 * Handler for the `list_meetings` MCP tool.
 *
 * Returns all meeting summaries sorted by generated_at descending.
 * Optional `limit` truncates from the start (i.e. returns the N newest).
 *
 * Pure function: takes a store and input, returns an MCP response.
 * No MCP SDK or context-loading concerns leak in — those live in index.ts.
 */
export async function listMeetingsHandler(
  store: MeetingsStore,
  input: ListMeetingsInput,
): Promise<CallToolResult> {
  const all: MeetingSummary[] = await store.list();
  const limited = input.limit !== undefined ? all.slice(0, input.limit) : all;
  return {
    content: [
      { type: 'text', text: JSON.stringify(limited, null, 2) },
    ],
  };
}
