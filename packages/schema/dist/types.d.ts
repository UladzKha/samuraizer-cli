/**
 * AUTO-GENERATED. Do not edit by hand.
 *
 * Generated from spec/meeting-output.schema.json.
 * To generate, run: npm run build --workspace=@samuraizer/schema
 */

/**
 * Open, portable schema for meeting recordings processed into structured outputs (transcript, summary, action items, decisions). Designed to be tool-agnostic so any local-first transcription pipeline can produce or consume it.
 */
export interface MeetingOutput {
  /**
   * Version of this schema the document conforms to. Follows semver. Consumers MUST check this field before parsing.
   */
  schema_version: "0.1.0";
  /**
   * Globally unique identifier for this meeting output. ULID is RECOMMENDED (sortable by creation time, 26 chars, Crockford base32). UUIDs are also accepted.
   */
  meeting_id: string;
  /**
   * When this document was produced, as RFC 3339 timestamp with timezone. Distinct from source.recorded_at.
   */
  generated_at: string;
  /**
   * Information about the original recording. Treat as the input side of the pipeline.
   */
  source: {
    /**
     * Basename of the source file as seen by the user. Path-stripped to avoid leaking filesystem layout.
     */
    file_name: string;
    /**
     * SHA-256 hash of the source audio file content (lowercase hex). Anchors chain of custody: any downstream artifact can be tied back to the exact bytes that produced it.
     */
    sha256: string;
    /**
     * Container/codec name as reported by ffprobe (e.g. 'mp4,m4a', 'wav', 'mp3').
     */
    format: string;
    /**
     * Duration of the source audio in seconds.
     */
    duration_sec?: number;
    /**
     * Size of the source file in bytes.
     */
    size_bytes?: number;
    /**
     * Audio sample rate in Hz, e.g. 44100, 48000.
     */
    sample_rate_hz?: number;
    /**
     * Number of audio channels.
     */
    channels?: number;
    /**
     * Audio codec name as reported by ffprobe (e.g. 'aac', 'pcm_s16le').
     */
    codec?: string;
    /**
     * When the recording was captured, if known (RFC 3339). May come from file mtime, container metadata, or user input. Distinct from generated_at.
     */
    recorded_at?: string;
  };
  /**
   * Time-aligned speech-to-text output.
   */
  transcript: {
    /**
     * BCP 47 language tag detected or specified for the recording (e.g. 'en', 'ru', 'en-US'). Use 'und' if undetermined.
     */
    language: string;
    /**
     * Full transcript as plain text. Convenience field; canonical content lives in segments.
     */
    text: string;
    /**
     * Ordered list of transcript segments. The unit of granularity for source_segment_ref pointers from action_items and decisions.
     */
    segments: TranscriptSegment[];
  };
  /**
   * Free-form meeting summary produced by an LLM.
   */
  summary?: {
    /**
     * Summary as plain text or lightweight Markdown.
     */
    text: string;
  };
  /**
   * Concrete tasks identified in the meeting that require follow-up.
   */
  action_items?: ActionItem[];
  /**
   * Final decisions agreed upon during the meeting.
   */
  decisions?: Decision[];
  /**
   * Known meeting participants. May be empty if speaker identification was not performed.
   */
  participants?: Participant[];
  /**
   * Chain of custody: which tools, models, and configuration produced this document. Critical for trust and reproducibility. Consumers can use this to verify or reproduce results.
   */
  provenance: {
    /**
     * The software that generated this document.
     */
    producer: {
      /**
       * Producer identifier, e.g. 'samuraizer'.
       */
      name: string;
      /**
       * Producer semver, e.g. '0.2.0'.
       */
      version: string;
    };
    /**
     * Per-stage tool and model identification. Each stage is optional so that partial pipelines (e.g. transcript-only) are valid.
     */
    pipeline: {
      transcription?: TranscriptionProvenance;
      summary?: LlmProvenance;
      action_items?: LlmProvenance;
      decisions?: LlmProvenance;
    };
  };
}
/**
 * A single time-aligned chunk of transcript.
 */
export interface TranscriptSegment {
  /**
   * Stable identifier for this segment within the document. Recommended format: 'seg_NNNN' zero-padded. Used as target for source_segment_ref.
   */
  id: string;
  /**
   * Segment start time in seconds from the beginning of the recording.
   */
  start_sec: number;
  /**
   * Segment end time in seconds. Must be greater than or equal to start_sec.
   */
  end_sec: number;
  /**
   * Transcribed text for this segment.
   */
  text: string;
  /**
   * Reference to participants[].id if diarization was performed. Null if speaker is unknown.
   */
  speaker_id?: string | null;
  /**
   * Optional ASR confidence score in [0, 1]. Null if the engine does not expose it.
   */
  confidence?: number | null;
  /**
   * True if start_sec/end_sec are not real timecodes from the ASR engine but were synthesized (e.g. line-based fallback). Default false. Allows consumers to know when timing is reliable.
   */
  is_approximate_timing?: boolean;
}
/**
 * A task to be done after the meeting.
 */
export interface ActionItem {
  /**
   * Stable identifier within the document. Recommended format: 'act_NNNN'.
   */
  id: string;
  /**
   * The task description.
   */
  text: string;
  /**
   * Free-form name or handle. May reference participants[].name when speaker resolution exists, but is not constrained to it (LLMs may name people not present).
   */
  assignee?: string | null;
  /**
   * Original phrasing of the deadline as it appeared in the meeting (e.g. 'by end of week', 'next Friday'). Preserves the user's intent even when not parseable to a calendar date.
   */
  due_date?: string | null;
  /**
   * Normalized deadline as ISO 8601 date (YYYY-MM-DD), if it could be resolved. Null when due_date is fuzzy or absent.
   */
  due_date_iso?: string | null;
  /**
   * Lifecycle status. Defaults to 'open' for newly extracted items. Forward-compatible field; consumers may extend.
   */
  status?: "open" | "in_progress" | "done" | "cancelled";
  /**
   * Transcript segment IDs that support this action item. Provides chain of evidence: each item can be traced back to the audio segments that produced it. May be empty if the LLM did not provide grounding.
   */
  source_segment_ref?: string[];
}
/**
 * A confirmed decision reached during the meeting.
 */
export interface Decision {
  /**
   * Stable identifier within the document. Recommended format: 'dec_NNNN'.
   */
  id: string;
  /**
   * The decision itself, stated concisely.
   */
  text: string;
  /**
   * Optional rationale or surrounding context that explains why the decision was made.
   */
  context?: string | null;
  /**
   * Transcript segment IDs that support this decision. Same role as in action_items.
   */
  source_segment_ref?: string[];
}
/**
 * A meeting participant. Used to anchor speaker_id references in transcript.segments.
 */
export interface Participant {
  /**
   * Stable identifier within the document. Recommended format: 'p_NNNN' or a diarizer-provided label (e.g. 'SPEAKER_00').
   */
  id: string;
  /**
   * Display name. May be a real name, an inferred name, or a placeholder like 'Speaker 1'.
   */
  name: string;
  /**
   * Optional role in the meeting (e.g. 'host', 'engineer', 'PM').
   */
  role?: string | null;
}
/**
 * Identification of the ASR engine and model used.
 */
export interface TranscriptionProvenance {
  /**
   * ASR engine identifier (e.g. 'whisper.cpp', 'whisper', 'vosk').
   */
  engine: string;
  /**
   * Engine version string, when available.
   */
  engine_version?: string;
  /**
   * Logical model name (e.g. 'ggml-large-v3', 'whisper-large-v3').
   */
  model_name?: string;
  /**
   * SHA-256 of the model weights file. Recommended for reproducibility, optional in 0.1.0.
   */
  model_sha256?: string;
}
/**
 * Identification of the LLM and runtime used for a generation step.
 */
export interface LlmProvenance {
  /**
   * LLM runtime identifier (e.g. 'ollama', 'llama.cpp', 'openai-compatible').
   */
  runtime: string;
  /**
   * Runtime version, when available.
   */
  runtime_version?: string;
  /**
   * Model identifier as used by the runtime (e.g. 'qwen2.5:14b', 'llama3.1:8b').
   */
  model_name: string;
  /**
   * Runtime-reported content digest for the model (e.g. Ollama's sha256 digest). Anchors which exact weights were used.
   */
  model_digest?: string;
  /**
   * Sampling temperature used for this step.
   */
  temperature?: number;
}
