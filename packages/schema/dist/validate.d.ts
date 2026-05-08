import type { MeetingOutput } from "../dist/types.js";
export type ValidationError = {
    /** JSON Pointer to the offending field, e.g. "/transcript/segments/0/end_sec". */
    path: string;
    /** Short human-readable description, e.g. "must be >= 0". */
    message: string;
    /** Underlying ajv keyword that failed, e.g. "type", "required", "pattern". */
    keyword: string;
};
export type ValidationResult = {
    valid: true;
    data: MeetingOutput;
} | {
    valid: false;
    errors: ValidationError[];
};
/**
 * Validate an unknown value against the meeting output schema.
 *
 * On success the value is returned, narrowed to MeetingOutput.
 * On failure a list of human-readable errors is returned.
 *
 * @example
 *   const result = validate(JSON.parse(text));
 *   if (result.valid) {
 *       console.log(result.data.meeting_id);
 *   } else {
 *       for (const err of result.errors) {
 *           console.error(`${err.path}: ${err.message}`);
 *       }
 *   }
 */
export declare function validate(data: unknown): ValidationResult;
/**
 * Type guard variant of validate(). Returns true if data conforms to the
 * meeting output schema, narrowing the type accordingly.
 *
 * Errors are not exposed; use validate() if you need diagnostics.
 */
export declare function isValid(data: unknown): data is MeetingOutput;
//# sourceMappingURL=validate.d.ts.map