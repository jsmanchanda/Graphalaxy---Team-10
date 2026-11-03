/**
 * What went wrong with a request.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

/**
 * A failed request to the backend.
 * @param kind What went wrong.
 * @param message A description of the failure.
 * @param status The HTTP status, for `http` errors.
 * @param code The backend's error code, for `http` errors that include one.
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   * @param kind What went wrong.
   * @param message A description of the failure.
   * @param status The HTTP status, for `http` errors.
   * @param code The backend's error code, for `http` errors that include one.
   */
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
