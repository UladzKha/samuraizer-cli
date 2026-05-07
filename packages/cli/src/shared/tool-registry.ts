import { extractActionItemsTool } from "../tools/analysis/extract-action-items-tool.js";
import { extractDecisionsTool } from "../tools/analysis/extract-decisions-tool.js";
import { summarizeTranscriptionTool } from "../tools/analysis/summarize-transcription-tool.js";
import { normalizeAudioTool } from "../tools/input/normalize-audio-tool.js";
import { transcribeAudioTool } from "../tools/transcription/transcribe-audio-tool.js";

export const tools = {
    normalize_audio: normalizeAudioTool,
    transcribe_audio: transcribeAudioTool,
    summarize_transcript: summarizeTranscriptionTool,
    extract_action_items: extractActionItemsTool,
    extract_decisions: extractDecisionsTool,
};

export type ToolRegistry = typeof tools;