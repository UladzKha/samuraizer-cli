import { Ajv2020 } from "ajv/dist/2020.js";
import { default as _addFormats } from "ajv-formats";
import schema from "../spec/meeting-output.schema.json" with { type: "json" };
const ajv = new Ajv2020({ allErrors: true, strict: true });
_addFormats(ajv);
const validateFn = ajv.compile(schema);
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
export function validate(data) {
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
export function isValid(data) {
    return validateFn(data) === true;
}
function toValidationError(err) {
    return {
        path: err.instancePath || "/",
        message: err.message ?? "validation failed",
        keyword: err.keyword,
    };
}
//# sourceMappingURL=validate.js.map