import jwt from 'jsonwebtoken';

export function signSessionToken(userId: string, secret: string, ttlDays: number): string {
  return jwt.sign({}, secret, { subject: userId, expiresIn: `${ttlDays}d`, algorithm: 'HS256' });
}

/** Returns the user id stored in a valid token, or null if the token is invalid or expired. */
export function verifySessionToken(token: string, secret: string): string | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
