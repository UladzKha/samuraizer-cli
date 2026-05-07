import { loadConfig } from "../config/load.js";
import { ToolContext } from "./types.js";

export async function createContext(): Promise<ToolContext>{
    return {
        config: await loadConfig(),
        logger: console,
    }
}