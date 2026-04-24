import { writeFile } from "node:fs/promises";
import type { ActionItemsResult } from "../analysis/action-items/types.js";
import type { DecisionsResult } from "../analysis/decisions/types.js";
import type { SummaryResult } from "../analysis/summary/types.js";
import type { Transcript } from "../transcription/types.js";

export type GenerateReportInput = {
    reportPath: string;
    meetingTitle: string;
    sourceFileName: string;
    transcript: Transcript;
    summary: SummaryResult;
    actionItems: ActionItemsResult;
    decisions: DecisionsResult;
};

export async function generateReport({
    reportPath,
    meetingTitle,
    sourceFileName,
    transcript,
    summary,
    actionItems,
    decisions,
}: GenerateReportInput): Promise<void> {
    const markdown = buildMarkdownReport({ meetingTitle, sourceFileName, transcript, summary, actionItems, decisions });
    await writeFile(reportPath, markdown, "utf-8");
}

function buildMarkdownReport({
    meetingTitle,
    sourceFileName,
    transcript,
    summary,
    actionItems,
    decisions,
}: Omit<GenerateReportInput, "reportPath">): string {
    const lines: string[] = [];

    lines.push(`# Meeting Report: ${esc(meetingTitle)}`);
    lines.push("");
    lines.push(`**Source file:** ${esc(sourceFileName)}`);
    lines.push(`**Created at:** ${esc(summary.createdAt)}`);
    lines.push(`**Summary model:** ${esc(summary.model)}`);
    lines.push(`**Action items model:** ${esc(actionItems.model)}`);
    lines.push(`**Decisions model:** ${esc(decisions.model)}`);
    lines.push("");

    lines.push("## Summary");
    lines.push("");
    lines.push(summary.summary.trim() || "No summary available.");
    lines.push("");

    lines.push("## Action Items");
    lines.push("");
    if (actionItems.items.length === 0) {
        lines.push("No action items found.");
    } else {
        for (const item of actionItems.items) {
            const details = [
                item.owner ? `owner: ${item.owner}` : null,
                item.dueDate ? `due: ${item.dueDate}` : null,
            ].filter(Boolean);
            lines.push(details.length > 0 ? `- ${item.text} — ${details.join(", ")}` : `- ${item.text}`);
        }
    }

    lines.push("");
    lines.push("## Decisions");
    lines.push("");
    if (decisions.items.length === 0) {
        lines.push("No decisions found.");
    } else {
        for (const item of decisions.items) {
            lines.push(`- ${item.text}`);
        }
    }

    lines.push("");
    lines.push("## Transcript");
    lines.push("");
    lines.push(transcript.text.trim() || "No transcript available.");
    lines.push("");

    return lines.join("\n");
}

function esc(value: string): string {
    return value.replace(/([*_`[\]])/g, "\\$1");
}
