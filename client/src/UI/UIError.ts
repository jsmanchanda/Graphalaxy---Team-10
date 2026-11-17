/**
 * Types of UI error
 */
export type UiErrorType = 'OutOfBounds' | 'InvalidInput';

/**
 * A failed request to the backend.
 * @param kind What went wrong.
 * @param message A description of the failure.
 */
export class UiError extends Error {
  /**
   * Creates a new ApiError instance.
   * @param kind What went wrong.
   * @param message A description of the failure.
   */
  constructor(
    readonly kind: UiErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'UIError';
  }
}
