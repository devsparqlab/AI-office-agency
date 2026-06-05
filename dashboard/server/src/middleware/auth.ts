import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

/**
 * Constant-time string comparison to avoid leaking the token via timing.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Extracts the bearer token from the Authorization header, falling back to a
 * `token` query param. The query fallback exists because the browser
 * EventSource API (used for SSE at /api/events) cannot set custom headers.
 */
export function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const value = header.slice('Bearer '.length).trim();
    if (value) {
      return value;
    }
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }

  return undefined;
}

/**
 * Builds an Express middleware that requires a shared bearer token.
 * When `expectedToken` is undefined/empty, auth is disabled (passthrough),
 * which keeps local development friction-free.
 */
export function createAuthMiddleware(expectedToken: string | undefined) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedToken) {
      next();
      return;
    }

    const provided = extractToken(req);
    if (provided && timingSafeEqualStr(provided, expectedToken)) {
      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized' });
  };
}
