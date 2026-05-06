import { SamuraizerConfig } from "../config/types.js";

export interface ToolContext {
    config: SamuraizerConfig;
    logger: Logger;
}

export interface Logger {
    info(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
}