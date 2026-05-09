import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { hashPassword, verifyPasswordHash } from '../auth/auth.ts';
import { DatabaseService } from '../database/database.ts';
import { createTestApp } from '../test-helpers.ts';
import type { TestContext } from '../test-helpers.ts';

let t: TestContext;

beforeEach(async () => {
  t = await createTestApp();
});

afterEach(async () => {
  await t.stop();
});

describe('POST /api/auth/login', () => {
  it('issues a token for valid admin credentials', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin-password' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { token: string; user: { username: string; role: string } };
    expect(body.token).toBeDefined();
    expect(body.user).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('rejects an unknown username with 401', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'nope', password: 'whatever' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a wrong password with 401 (no enumeration)', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user when authenticated', async () => {
    const admin = await t.loginAdmin();
    const res = await t.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: admin.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ username: 'admin', role: 'admin' });
  });

  it('rejects requests without a token', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with a malformed bearer header', async () => {
    const res = await t.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Token nope' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await t.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer not-a-real-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Admin bootstrap reconciliation', () => {
  it('keeps the admin password in sync with the env value across restarts', async () => {
    // First start: admin is created from env. Drift the stored hash to
    // simulate a forgotten password / out-of-band corruption.
    const db = await t.services.get(DatabaseService).getInstance();
    await db
      .updateTable('users')
      .where('username', '=', 'admin')
      .set({ password_hash: await hashPassword('something-else') })
      .execute();

    // Sanity: login with the env password fails right now.
    const beforeReboot = await t.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin-password' },
    });
    expect(beforeReboot.statusCode).toBe(401);

    // Stop and re-create the app — bootstrap runs again and reconciles the
    // password back to the env value.
    await t.stop();
    t = await createTestApp();

    const afterReboot = await t.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin-password' },
    });
    expect(afterReboot.statusCode).toBe(200);
  });

  it('forces role=admin if the env-bootstrapped user was demoted', async () => {
    const db = await t.services.get(DatabaseService).getInstance();
    await db.updateTable('users').where('username', '=', 'admin').set({ role: 'user' }).execute();

    await t.stop();
    t = await createTestApp();

    const admin = await t.loginAdmin();
    const me = await t.inject({ method: 'GET', url: '/api/auth/me', headers: admin.headers });
    expect(JSON.parse(me.body)).toMatchObject({ role: 'admin' });
  });
});

describe('Password hashing', () => {
  it('round-trips through hash + verify', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPasswordHash('correct horse battery staple', hash)).toBe(true);
    expect(await verifyPasswordHash('something else', hash)).toBe(false);
  });

  it('produces a different salt each call', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
  });
});
