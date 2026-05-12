import type { z } from "zod";
import type { configSchema } from "./schema.js";

export type SamuraizerConfig = z.infer<typeof configSchema>;
