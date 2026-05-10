import type { ListResourcesResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { MeetingsStore } from '../lib/meetings-store/types.js';

const URI_PREFIX = 'meeting://';

/**
 * List callback for the `meeting://{id}` ResourceTemplate.
 *
 * Surfaces every meeting in meetingsDir as an attachable resource.
 * Claude Desktop displays these in the attachment menu so users can
 * include a specific meeting in their context with one click.
 */
export async function listMeetingResources(
  store: MeetingsStore,
): Promise<ListResourcesResult> {
  const summaries = await store.list();
  return {
    resources: summaries.map((s) => ({
      uri: `${URI_PREFIX}${s.id}`,
      name: s.name,
      description: `${s.generated_at}${s.summary_preview ? ' — ' + s.summary_preview : ''}`,
      mimeType: 'application/json',
    })),
  };
}

/**
 * Read callback for the `meeting://{id}` ResourceTemplate.
 *
 * Returns the full meeting.json contents. Throws if the id is unknown
 * — MCP SDK serializes the error into a proper protocol response.
 */
export async function readMeetingResource(
  store: MeetingsStore,
  uri: URL,
  id: string,
): Promise<ReadResourceResult> {
  const meeting = await store.get(id);
  if (!meeting) {
    throw new Error(`No meeting found with id: ${id}`);
  }
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(meeting, null, 2),
      },
    ],
  };
}
