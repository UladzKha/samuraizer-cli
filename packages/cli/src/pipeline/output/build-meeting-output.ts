import path from "node:path";
import { ulid } from "ulid";
import type { MeetingOutput } from "@samuraizer/schema/types";
import type { ActionItemsResult } from "../analysis/action-items/types.js";
import type { DecisionsResult } from "../analysis/decisions/types.js";
import type { SummaryResult } from "../analysis/summary/types.js";
import type { Transcript } from "../transcription/types.js";
import type { RunMeta } from "./prepare.js";

export type BuildMeetingOutputInput = {
    meta: RunMeta;
    transcript: Transcript;
    summary: SummaryResult;
    actionItems: ActionItemsResult;
    decisions: DecisionsResult;
    sourceSha256: string;
    producerVersion: string;
};

/**
 * Build a meeting-output document conforming to @samuraizer/schema v0.1.0.
 *
 * Pure function: no I/O, no side effects. The caller is responsible for
 * computing the source SHA-256, reading the producer version, validating
 * the result via @samuraizer/schema, and writing the JSON to disk.
 */
export function buildMeetingOutput(input: BuildMeetingOutputInput): MeetingOutput {
    const { meta, transcript, summary, actionItems, decisions, sourceSha256, producerVersion } = input;

    return {
        schema_version: "0.1.0",
        meeting_id: ulid(),
        generated_at: new Date().toISOString(),

        source: buildSource(meta, sourceSha256),
        transcript: buildTranscript(transcript),
        summary: { text: summary.summary },
        action_items: actionItems.items.map((item, i) => ({
            id: `act_${i + 1}`,
            text: item.text,
            assignee: item.owner,
            due_date: item.dueDate,
            due_date_iso: null,
        })),
        decisions: decisions.items.map((item, i) => ({
            id: `dec_${i + 1}`,
            text: item.text,
            context: null,
        })),

        provenance: buildProvenance(meta, summary, actionItems, decisions, producerVersion),
    };
}

function buildSource(meta: RunMeta, sourceSha256: string): MeetingOutput["source"] {
    const audio = meta.input.audioMetadata;
    const format = audio?.formatName ?? meta.input.extension.replace(/^\./, "");

    const source: MeetingOutput["source"] = {
        file_name: meta.input.fileName,
        sha256: sourceSha256,
        format,
    };

    if (audio?.durationSec !== undefined) source.duration_sec = audio.durationSec;
    if (audio?.sizeBytes !== undefined) source.size_bytes = audio.sizeBytes;
    if (audio?.sampleRate !== undefined) source.sample_rate_hz = audio.sampleRate;
    if (audio?.channels !== undefined) source.channels = audio.channels;
    if (audio?.codecName !== undefined) source.codec = audio.codecName;

    return source;
}

function buildTranscript(transcript: Transcript): MeetingOutput["transcript"] {
    const language = transcript.language && transcript.language.trim().length > 0
        ? transcript.language.toLowerCase()
        : "und";

    return {
        language,
        text: transcript.text,
        segments: transcript.segments.map((seg, i) => ({
            id: `seg_${i + 1}`,
            start_sec: seg.startSec,
            end_sec: seg.endSec,
            text: seg.text,
            speaker_id: null,
            confidence: null,
        })),
    };
}

function buildProvenance(
    meta: RunMeta,
    summary: SummaryResult,
    actionItems: ActionItemsResult,
    decisions: DecisionsResult,
    producerVersion: string,
): MeetingOutput["provenance"] {
    const transcriptionModelName = meta.transcription
        ? path.basename(meta.transcription.modelPath)
        : undefined;

    return {
        producer: {
            name: "samuraizer",
            version: producerVersion,
        },
        pipeline: {
            transcription: {
                engine: "whisper.cpp",
                ...(transcriptionModelName !== undefined && { model_name: transcriptionModelName }),
            },
            summary: {
                runtime: "ollama",
                model_name: summary.model,
            },
            action_items: {
                runtime: "ollama",
                model_name: actionItems.model,
            },
            decisions: {
                runtime: "ollama",
                model_name: decisions.model,
            },
        },
    };
}
