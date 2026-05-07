import type { MeetingOutput } from "@samuraizer/schema/types";

const meeting: MeetingOutput = {
    schema_version: "0.1.0",
    meeting_id: "01HXR5K7P8Q3M2N4VWXYZABCDE",
    generated_at: "2026-05-07T14:30:00Z",
    source: {
        file_name: "test.m4a",
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        format: "wav",
    },
    transcript: {
        language: "en",
        text: "Hello world.",
        segments: [
            {
                id: "seg_0001",
                start_sec: 0,
                end_sec: 1.5,
                text: "Hello world.",
            },
        ],
    },
    provenance: {
        producer: { name: "samuraizer", version: "0.2.0" },
        pipeline: {
            transcription: { engine: "whisper.cpp" },
        },
    },
};

console.log(`Smoke test passed: ${meeting.meeting_id}`);
