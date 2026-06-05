import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { createAuthMiddleware, extractToken } from './auth';

function mockReq(opts: { authorization?: string; token?: string }): Request {
  return {
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    query: opts.token !== undefined ? { token: opts.token } : {},
  } as unknown as Request;
}

function mockRes(): Response & { statusCode?: number; body?: unknown } {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  return res;
}

test('extractToken reads Bearer header', () => {
  assert.equal(extractToken(mockReq({ authorization: 'Bearer abc123' })), 'abc123');
});

test('extractToken falls back to query param (for SSE)', () => {
  assert.equal(extractToken(mockReq({ token: 'xyz789' })), 'xyz789');
});

test('extractToken returns undefined when nothing is provided', () => {
  assert.equal(extractToken(mockReq({})), undefined);
});

test('auth disabled (no token configured) passes through', () => {
  const mw = createAuthMiddleware(undefined);
  let called = false;
  mw(mockReq({}), mockRes(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test('valid token via header is allowed', () => {
  const mw = createAuthMiddleware('secret');
  let called = false;
  mw(mockReq({ authorization: 'Bearer secret' }), mockRes(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test('valid token via query param is allowed', () => {
  const mw = createAuthMiddleware('secret');
  let called = false;
  mw(mockReq({ token: 'secret' }), mockRes(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test('wrong token is rejected with 401', () => {
  const mw = createAuthMiddleware('secret');
  const res = mockRes();
  let called = false;
  mw(mockReq({ authorization: 'Bearer nope' }), res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('missing token is rejected with 401 when auth is enabled', () => {
  const mw = createAuthMiddleware('secret');
  const res = mockRes();
  let called = false;
  mw(mockReq({}), res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});
