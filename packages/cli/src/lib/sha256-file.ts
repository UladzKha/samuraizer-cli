import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";

/**
 * Compute the SHA-256 hash of a file, streaming its contents to avoid
 * loading large files (e.g. multi-hundred-MB audio recordings) into memory.
 *
 * Returns a lowercase hex string of length 64, matching the
 * `^[a-f0-9]{64}$` pattern expected by the meeting-output schema.
 */
export async function sha256File(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const hash = createHash("sha256");
        const stream = createReadStream(filePath);

        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}
