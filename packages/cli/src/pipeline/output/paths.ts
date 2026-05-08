import path from "node:path";
import type { ValidatedInputFile } from "../audio/validate-input.js";

export type OutputPaths = {
    outputRootDir: string;
    runDir: string;
    metaFilePath: string;
    normalizedAudioPath: string;
    transcriptTextPath: string;
    transcriptJsonPath: string;
    summaryTextPath: string;
    summaryJsonPath: string;
    actionItemsTextPath: string;
    actionItemsJsonPath: string;
    decisionsTextPath: string;
    decisionsJsonPath: string;
    reportMarkdownPath: string;
    meetingJsonPath: string;
};

export function buildOutputPaths(inputFile: ValidatedInputFile, outputRootDir: string = path.resolve("output")): OutputPaths {
    const runDir = path.join(outputRootDir, inputFile.baseName);

    return {
        outputRootDir,
        runDir,
        metaFilePath: path.join(runDir, "meta.json"),
        normalizedAudioPath: path.join(runDir, "normalized.wav"),
        transcriptTextPath: path.join(runDir, "transcript.txt"),
        transcriptJsonPath: path.join(runDir, "transcript.json"),
        summaryTextPath: path.join(runDir, "summary.txt"),
        summaryJsonPath: path.join(runDir, "summary.json"),
        actionItemsTextPath: path.join(runDir, "action-items.txt"),
        actionItemsJsonPath: path.join(runDir, "action-items.json"),
        decisionsTextPath: path.join(runDir, "decisions.txt"),
        decisionsJsonPath: path.join(runDir, "decisions.json"),
        reportMarkdownPath: path.join(runDir, "report.md"),
        meetingJsonPath: path.join(runDir, "meeting.json"),
    };
}
