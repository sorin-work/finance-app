import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const VALID_ID = /^[\w-]{1,64}$/;

/**
 * Reuses the X-Request-Id sent by a proxy (when it looks sane) or creates a
 * new one, and echoes it back so a user's bug report can be matched to logs.
 */
export function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  return id;
}
