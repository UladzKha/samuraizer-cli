import { access, mkdir, writeFile } from "node:fs/promises";
import { getConfigDir, getConfigFilePath } from "./paths.js";
import { configTemplate } from "./template.js";

export type InitConfigResult = {
    path: string;
    created: boolean;
};

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function initConfig(): Promise<InitConfigResult> {
    const filePath = getConfigFilePath();
    if (await fileExists(filePath)) {
        return { path: filePath, created: false };
    }
    await mkdir(getConfigDir(), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(configTemplate, null, 2)}\n`, "utf-8");
    return { path: filePath, created: true };
}
