import { Ajv2020 } from "ajv/dist/2020.js";
import { default as _addFormats } from "ajv-formats";
import type { FormatsPlugin } from "ajv-formats";
import type { ErrorObject } from "ajv";
import schema from "../spec/meeting-output.schema.json" with { type: "json" };
import type { MeetingOutput } from "../dist/types.js";

export type ValidationError = {
    /** JSON Pointer to the offending field, e.g. "/transcript/segments/0/end_sec". */
    path: string;
    /** Short human-readable description, e.g. "must be >= 0". */
    message: string;
    /** Underlying ajv keyword that failed, e.g. "type", "required", "pattern". */
    keyword: string;
};

export type ValidationResult =
    | { valid: true; data: MeetingOutput }
    | { valid: false; errors: ValidationError[] };

const ajv = new Ajv2020({ allErrors: true, strict: true });
(_addFormats as unknown as FormatsPlugin)(ajv);

const validateFn = ajv.compile<MeetingOutput>(schema);

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
export function validate(data: unknown): ValidationResult {
    if (validateFn(data)) {
        return { valid: true, data };
    }
    return {
        valid: false,
        errors: (validateFn.errors ?? []).map(toValidationError),
    };
}

/**
 * Type guard variant of validate(). Returns true if data conforms to the
 * meeting output schema, narrowing the type accordingly.
 *
 * Errors are not exposed; use validate() if you need diagnostics.
 */
export function isValid(data: unknown): data is MeetingOutput {
    return validateFn(data) === true;
}

function toValidationError(err: ErrorObject): ValidationError {
    return {
        path: err.instancePath || "/",
        message: err.message ?? "validation failed",
        keyword: err.keyword,
    };
}