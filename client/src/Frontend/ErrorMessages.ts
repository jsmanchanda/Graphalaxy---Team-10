/**
 * Error message templates for session cache models.
 * Each template is a function that returns a formatted error message string.
 */
const MISSING_FIELDS_ERROR = (fields: string[]) =>
  `missing ${fields.join(', ')}`;
/**
 * Error message template for class creation errors from JSON.
 */
const CLASS_CREATION_ERROR = (className: string, error: unknown) =>
  `Failed to create ${className} from JSON: ${error}`;

export {MISSING_FIELDS_ERROR, CLASS_CREATION_ERROR};
