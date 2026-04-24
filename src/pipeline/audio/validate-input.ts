import { access, stat } from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";

export const SUPPORTED_AUDIO_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".ogg",
    ".flac",
    ".m4a",
    ".mp4",
    ".aac",
] as const;

export type SupportedExtension = (typeof SUPPORTED_AUDIO_EXTENSIONS)[number];

export type ValidatedInputFile = {
    inputPath: string;
    resolvedPath: string;
    fileName: string;
    baseName: string;
    extension: SupportedExtension;
};

export async function validateInputFile(inputPath: string): Promise<ValidatedInputFile> {
    if (!inputPath || !inputPath.trim()) throw new Error("No input file provided.");

    const resolvedPath = path.resolve(inputPath);
    const extension = path.extname(resolvedPath).toLowerCase() as SupportedExtension;

    if (!isSupportedExtension(extension)) {
        throw new Error(
            [
                `Unsupported file format: ${extension || "(no extension)"}`,
                `Supported formats: ${SUPPORTED_AUDIO_EXTENSIONS.join(", ")}`,
            ].join("\n"),
        );
    }

    try {
        await access(resolvedPath, constants.F_OK);
    } catch {
        throw new Error(`File does not exist: ${resolvedPath}`);
    }

    try {
        await stat(resolvedPath);
    } catch {
        throw new Error(`Path is not a file: ${resolvedPath}`);
    }

    return {
        inputPath,
        resolvedPath,
        fileName: path.basename(resolvedPath),
        baseName: path.basename(resolvedPath, extension),
        extension,
    };
}

function isSupportedExtension(extension: string): extension is SupportedExtension {
    return (SUPPORTED_AUDIO_EXTENSIONS as readonly string[]).includes(extension);
}
