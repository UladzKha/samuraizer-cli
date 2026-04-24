import { writeFile } from "node:fs/promises";
import type { ActionItemsResult } from "../analysis/action-items/types.js";
import type { DecisionsResult } from "../analysis/decisions/types.js";
import type { SummaryResult } from "../analysis/summary/types.js";
import type { Transcript } from "../transcription/types.js";
import type { OutputPaths } from "./paths.js";
import type { RunMeta } from "./prepare.js";

export async function saveTranscript(path: string, transcript: Transcript): Promise<void> {
    await writeFile(path, JSON.stringify(transcript, null, 2), "utf-8");
}

export async function saveSummary(path: string, summary: SummaryResult): Promise<void> {
    await writeFile(path, JSON.stringify(summary, null, 2), "utf-8");
}

export async function saveActionItems(path: string, actionItems: ActionItemsResult): Promise<void> {
    await writeFile(path, JSON.stringify(actionItems, null, 2), "utf-8");
}

export async function saveDecisions(path: string, decisions: DecisionsResult): Promise<void> {
    await writeFile(path, JSON.stringify(decisions, null, 2), "utf-8");
}

export async function saveMeta(paths: OutputPaths, meta: RunMeta): Promise<void> {
    await writeFile(paths.metaFilePath, JSON.stringify(meta, null, 2), "utf-8");
}
