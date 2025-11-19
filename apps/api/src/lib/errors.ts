/** An error that maps directly to an HTTP response. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, 'bad_request', details);

export const unauthorized = (message = 'Authentication required') =>
  new HttpError(401, message, 'unauthorized');

export const notFound = (resource = 'Resource') =>
  new HttpError(404, `${resource} not found`, 'not_found');

export const conflict = (message: string) => new HttpError(409, message, 'conflict');
