import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../test-helpers.ts';
import type { AuthedUser, TestContext } from '../test-helpers.ts';

let t: TestContext;

beforeEach(async () => {
  t = await createTestApp();
});

afterEach(async () => {
  await t.stop();
});

const registerDevice = async (
  user: AuthedUser,
  body: { integration: string; device_id: string; name: string },
): ReturnType<TestContext['inject']> =>
  t.inject({
    method: 'POST',
    url: '/api/devices',
    headers: user.headers,
    payload: body,
  });

describe('POST /api/devices', () => {
  it('creates a device and returns 201', async () => {
    const admin = await t.loginAdmin();
    const res = await registerDevice(admin, {
      integration: 'gadgetbridge',
      device_id: 'EE:F5:4A:CA:BE:D3',
      name: 'vívosmart 5',
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({
      integration: 'gadgetbridge',
      device_id: 'EE:F5:4A:CA:BE:D3',
      name: 'vívosmart 5',
    });
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it('returns 409 on duplicate registration', async () => {
    const admin = await t.loginAdmin();
    const body = { integration: 'gadgetbridge', device_id: 'AA:BB:CC:DD:EE:FF', name: 'Watch' };
    const first = await registerDevice(admin, body);
    expect(first.statusCode).toBe(201);
    const second = await registerDevice(admin, body);
    expect(second.statusCode).toBe(409);
  });

  it('rejects requests without a token', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/devices',
      payload: { integration: 'gadgetbridge', device_id: 'x', name: 'y' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('lets two users register the same (integration, device_id) independently', async () => {
    const admin = await t.loginAdmin();
    const alice = await t.createUser('alice', 'alice-pw1234');
    const body = { integration: 'gadgetbridge', device_id: 'SAME:MAC:HERE', name: 'shared' };
    expect((await registerDevice(admin, body)).statusCode).toBe(201);
    expect((await registerDevice(alice, body)).statusCode).toBe(201);
  });
});

describe('GET /api/devices', () => {
  it('returns every device the calling user has registered', async () => {
    const admin = await t.loginAdmin();
    await registerDevice(admin, { integration: 'gadgetbridge', device_id: '11:11', name: 'First' });
    await registerDevice(admin, { integration: 'gadgetbridge', device_id: '22:22', name: 'Second' });
    const res = await t.inject({ method: 'GET', url: '/api/devices', headers: admin.headers });
    expect(res.statusCode).toBe(200);
    const { devices } = JSON.parse(res.body) as { devices: { name: string }[] };
    expect(devices.map((d) => d.name).sort()).toEqual(['First', 'Second']);
  });

  it('scopes results per user', async () => {
    const admin = await t.loginAdmin();
    const alice = await t.createUser('alice', 'alice-pw1234');
    await registerDevice(admin, { integration: 'gadgetbridge', device_id: 'AA', name: 'admin-device' });
    await registerDevice(alice, { integration: 'gadgetbridge', device_id: 'BB', name: 'alice-device' });
    const res = await t.inject({ method: 'GET', url: '/api/devices', headers: alice.headers });
    const { devices } = JSON.parse(res.body) as { devices: { name: string }[] };
    expect(devices.map((d) => d.name)).toEqual(['alice-device']);
  });

  it('rejects requests without a token', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/devices' });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /api/devices/:id', () => {
  it('renames a device and bumps updated_at', async () => {
    const admin = await t.loginAdmin();
    const created = JSON.parse(
      (await registerDevice(admin, { integration: 'gadgetbridge', device_id: 'XX', name: 'old' })).body,
    ) as { id: string; updated_at: string };
    const res = await t.inject({
      method: 'PATCH',
      url: `/api/devices/${created.id}`,
      headers: admin.headers,
      payload: { name: 'new' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { name: string; updated_at: string };
    expect(body.name).toBe('new');
    expect(body.updated_at >= created.updated_at).toBe(true);
  });

  it('returns 404 for an unknown id', async () => {
    const admin = await t.loginAdmin();
    const res = await t.inject({
      method: 'PATCH',
      url: '/api/devices/00000000-0000-0000-0000-000000000000',
      headers: admin.headers,
      payload: { name: 'nope' },
    });
    expect(res.statusCode).toBe(404);
  });

  it("returns 404 when targeting another user's device (no cross-user write)", async () => {
    const admin = await t.loginAdmin();
    const alice = await t.createUser('alice', 'alice-pw1234');
    const created = JSON.parse(
      (await registerDevice(admin, { integration: 'gadgetbridge', device_id: 'AC:01', name: 'admin' })).body,
    ) as { id: string };
    const res = await t.inject({
      method: 'PATCH',
      url: `/api/devices/${created.id}`,
      headers: alice.headers,
      payload: { name: 'hacked' },
    });
    expect(res.statusCode).toBe(404);
  });
});
