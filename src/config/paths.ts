import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "samuraizer";
const CONFIG_FILE_NAME = "config.json";

function getUserConfigDir(): string {
    const home = os.homedir();
    if (process.platform === "win32") {
        return process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    }
    if (process.platform === "darwin") {
        return path.join(home, "Library", "Application Support");
    }
    return process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
}

export function getConfigDir(): string {
    return path.join(getUserConfigDir(), APP_DIR_NAME);
}

export function getConfigFilePath(): string {
    return path.join(getConfigDir(), CONFIG_FILE_NAME);
}
