import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MeetingsStore } from '../lib/meetings-store/types.js';

export interface GetMeetingInput {
  id: string;
}

/**
 * Handler for the `get_meeting` MCP tool.
 *
 * Returns the full MeetingOutput document for the given id, or an
 * MCP tool error if not found.
 */
export async function getMeetingHandler(
  store: MeetingsStore,
  input: GetMeetingInput,
): Promise<CallToolResult> {
  const meeting = await store.get(input.id);
  if (!meeting) {
    return {
      content: [
        { type: 'text', text: `No meeting found with id: ${input.id}` },
      ],
      isError: true,
    };
  }
  return {
    content: [
      { type: 'text', text: JSON.stringify(meeting, null, 2) },
    ],
  };
}
