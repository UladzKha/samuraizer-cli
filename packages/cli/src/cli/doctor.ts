import { checkNodeVersion } from "../checks/node-version.js";
import { ensureFfmpeg } from "../checks/ffmpeg.js";
import { ensureFfprobe } from "../checks/ffprobe.js";
import { ensureWhisperCli } from "../checks/whisper.js";
import { ensureOllama, checkOllamaModel } from "../checks/ollama.js";
import { checkWhisperModelFile } from "../checks/model-file.js";
import { checkMeetingsDir } from "../checks/meetings-dir.js";
import { loadConfig } from "../config/load.js";
import { getConfigFilePath } from "../config/paths.js";
import type { SamuraizerConfig } from "../config/types.js";

export type DoctorCheck = { ok: boolean; message: string };
export type DoctorReport = {
    environment: DoctorCheck[];
    config: DoctorCheck[];
    ok: boolean;
};

async function runEnsure(fn: () => Promise<void>, successMessage: string): Promise<DoctorCheck> {
    try {
        await fn();
        return { ok: true, message: successMessage };
    } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * Runs before `samuraizer init` as well as after, so the environment checks
 * fall back to the same defaults `samuraizer init` writes rather than requiring
 * a config file to exist first.
 */
export async function runDoctor(): Promise<DoctorReport> {
    let config: SamuraizerConfig | undefined;
    try {
        config = await loadConfig();
    } catch {
        config = undefined;
    }

    const ffmpegCommand = config?.ffmpegCommand ?? "ffmpeg";
    const ffprobeCommand = config?.ffprobeCommand ?? "ffprobe";
    const whisperCommand = config?.whisperCommand ?? "whisper-cli";
    const ollamaBaseUrl = config?.ollamaBaseUrl ?? "http://127.0.0.1:11434";

    const environment: DoctorCheck[] = [
        checkNodeVersion(),
        await runEnsure(() => ensureFfmpeg(ffmpegCommand), `ffmpeg found (${ffmpegCommand})`),
        await runEnsure(() => ensureFfprobe(ffprobeCommand), `ffprobe found (${ffprobeCommand})`),
        await runEnsure(() => ensureWhisperCli(whisperCommand), `whisper-cli found (${whisperCommand})`),
        await runEnsure(() => ensureOllama(ollamaBaseUrl), `Ollama reachable at ${ollamaBaseUrl}`),
    ];

    const configChecks: DoctorCheck[] = [];
    if (!config) {
        configChecks.push({
            ok: false,
            message: `Config file not found at ${getConfigFilePath()}. Run 'samuraizer init' to create it.`,
        });
    } else {
        configChecks.push(await checkWhisperModelFile(config.whisperModelPath));
        configChecks.push(await checkMeetingsDir(config.meetingsDir));
        configChecks.push(await checkOllamaModel(config.ollamaBaseUrl, config.model));
    }

    const ok = [...environment, ...configChecks].every((c) => c.ok);
    return { environment, config: configChecks, ok };
}
