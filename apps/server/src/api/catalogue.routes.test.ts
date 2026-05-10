import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../test-helpers.ts';
import type { AuthedUser, TestContext } from '../test-helpers.ts';

let t: TestContext;
let admin: AuthedUser;

beforeEach(async () => {
  t = await createTestApp();
  admin = await t.loginAdmin();
});

afterEach(async () => {
  await t.stop();
});

describe('GET /api/catalogue', () => {
  it('returns the seeded canonical entries to the authenticated user', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue', headers: admin.headers });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { entries: { id: string; namespace: string; kind: string }[] };
    expect(body.entries.length).toBeGreaterThan(20);
    expect(body.entries.find((e) => e.id === 'heart_rate')).toMatchObject({
      id: 'heart_rate',
      namespace: 'canonical',
      kind: 'numeric',
    });
    expect(body.entries.find((e) => e.id === 'location')).toMatchObject({ kind: 'geo' });
    expect(body.entries.find((e) => e.id === 'blood_pressure')).toMatchObject({ kind: 'composite' });
    expect(body.entries.find((e) => e.id === 'run')).toMatchObject({ kind: 'session' });
    expect(body.entries.find((e) => e.id === 'strength_set')).toMatchObject({ kind: 'event' });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue' });
    expect(res.statusCode).toBe(401);
  });

  it('filters by namespace', async () => {
    const res = await t.inject({
      method: 'GET',
      url: '/api/catalogue?namespace=custom',
      headers: admin.headers,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ entries: [] });
  });

  it('filters by kind', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue?kind=geo', headers: admin.headers });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { entries: { kind: string }[] };
    expect(body.entries.every((e) => e.kind === 'geo')).toBe(true);
  });
});

describe('GET /api/catalogue/:id', () => {
  it('returns a numeric canonical entry with unit + range in config', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue/heart_rate', headers: admin.headers });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({
      id: 'heart_rate',
      kind: 'numeric',
      config: { unit: 'bpm', range: { min: 20, max: 250 } },
    });
  });

  it('returns a composite entry with per-component units', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue/blood_pressure', headers: admin.headers });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { kind: string; config: { components: Record<string, { unit: string }> } };
    expect(body.kind).toBe('composite');
    expect(body.config.components['systolic']?.unit).toBe('mmHg');
    expect(body.config.components['diastolic']?.unit).toBe('mmHg');
  });

  it('returns 404 for unknown entries', async () => {
    const res = await t.inject({
      method: 'GET',
      url: '/api/catalogue/does_not_exist',
      headers: admin.headers,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/catalogue/custom', () => {
  it('registers a vendor-namespaced custom numeric entry', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        description: 'Garmin stress score (0–100)',
        config: { unit: 'score', range: { min: 0, max: 100 } },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({
      id: 'garmin.stress_score',
      namespace: 'custom',
      kind: 'numeric',
      config: { unit: 'score' },
    });
  });

  it('registers a custom event entry with a JSON Schema payload contract', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: {
        id: 'myapp.hiit_round',
        kind: 'event',
        description: 'One round of a HIIT workout',
        config: {
          schema: {
            type: 'object',
            properties: {
              movement: { type: 'string' },
              work_seconds: { type: 'number', minimum: 0 },
              rest_seconds: { type: 'number', minimum: 0 },
            },
            required: ['movement', 'work_seconds'],
            additionalProperties: false,
          },
        },
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it('rejects collisions with the same user', async () => {
    const first = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: { id: 'foo.bar', kind: 'numeric', config: { unit: 'x' } },
    });
    expect(first.statusCode).toBe(201);

    const dup = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: { id: 'foo.bar', kind: 'numeric', config: { unit: 'x' } },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects non-vendor-namespaced ids', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: { id: 'no_namespace', kind: 'numeric', config: { unit: 'x' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects event schemas with external $ref', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: {
        id: 'evil.metric',
        kind: 'event',
        config: {
          schema: { type: 'object', properties: { foo: { $ref: 'https://evil.example/schema.json' } } },
        },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/External \$ref/);
  });

  it('rejects event entries with malformed JSON Schema', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: {
        id: 'bad.metric',
        kind: 'event',
        config: { schema: { type: 'not_a_real_type' } },
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/catalogue/aliases', () => {
  it('registers an alias and resolves it on subsequent lookups', async () => {
    const create = await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      headers: admin.headers,
      payload: { alias: 'apple.heart_rate', canonical_id: 'heart_rate' },
    });
    expect(create.statusCode).toBe(201);

    const list = await t.inject({
      method: 'GET',
      url: '/api/catalogue/aliases',
      headers: admin.headers,
    });
    expect(list.statusCode).toBe(200);
    const body = JSON.parse(list.body) as { aliases: { alias: string; canonical_id: string }[] };
    expect(body.aliases).toContainEqual(
      expect.objectContaining({ alias: 'apple.heart_rate', canonical_id: 'heart_rate' }),
    );
  });

  it('returns 404 when target catalogue entry does not exist', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      headers: admin.headers,
      payload: { alias: 'vendor.x', canonical_id: 'does_not_exist' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('User isolation — custom entries are scoped per user', () => {
  it('two users can register the same vendor.id without colliding', async () => {
    const alice = await t.createUser('alice', 'password-alice');
    const bob = await t.createUser('bob', 'password-bob');

    const aliceRes = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: alice.headers,
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        config: { unit: 'score', range: { min: 0, max: 100 } },
      },
    });
    expect(aliceRes.statusCode).toBe(201);

    const bobRes = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: bob.headers,
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        config: { unit: 'score', range: { min: 0, max: 50 } },
      },
    });
    expect(bobRes.statusCode).toBe(201);
  });

  it("alice cannot see bob's custom entries via list", async () => {
    const alice = await t.createUser('alice', 'password-alice');
    const bob = await t.createUser('bob', 'password-bob');

    await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: bob.headers,
      payload: { id: 'bob.private_metric', kind: 'numeric', config: { unit: 'x' } },
    });

    const list = await t.inject({
      method: 'GET',
      url: '/api/catalogue?namespace=custom',
      headers: alice.headers,
    });
    expect(list.statusCode).toBe(200);
    const body = JSON.parse(list.body) as { entries: { id: string }[] };
    expect(body.entries.find((e) => e.id === 'bob.private_metric')).toBeUndefined();
  });

  it("aliases are per-user — alice's apple.heart_rate doesn't bind for bob", async () => {
    const alice = await t.createUser('alice', 'password-alice');
    const bob = await t.createUser('bob', 'password-bob');

    await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      headers: alice.headers,
      payload: { alias: 'apple.heart_rate', canonical_id: 'heart_rate' },
    });

    const bobAliases = await t.inject({
      method: 'GET',
      url: '/api/catalogue/aliases',
      headers: bob.headers,
    });
    expect(bobAliases.statusCode).toBe(200);
    expect(JSON.parse(bobAliases.body)).toEqual({ aliases: [] });
  });
});
