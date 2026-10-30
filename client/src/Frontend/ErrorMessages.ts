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

/**
 * Error message template for fields outside their allowed range.
 */
const FIELD_RANGE_ERROR = (field: string, min: number, max: number) =>
  `Field ${field} must be between ${min} and ${max}`;

/**
 * Error message template for fields with incorrect types.
 */
const TYPE_ERROR = (field: string, expectedType: string) =>
  `Field ${field} must be of type ${expectedType}`;

export {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
  TYPE_ERROR,
};
