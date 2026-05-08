/**
 * @samuraizer/schema - open meeting output schema
 *
 * Public API:
 * - validate (data): runtime validation with detailed errors
 * - isValid (data): type guard variant
 * - schema: the raw JSON Schema document, for downstream tools
 * - MeetingOutput, ValidationResult, ValidationError: types
 */
import schema from "../spec/meeting-output.schema.json" with { type: "json" };
export { validate, isValid } from "./validate.js";
/**
 * The raw JSON Schema document. Useful for tools that want to compile
 * their own validator (e.g. with a different ajv configuration) or
 * generate language blindings beyond TypeScript.
 */
export { schema };
//# sourceMappingURL=index.js.map