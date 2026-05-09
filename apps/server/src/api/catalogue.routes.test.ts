import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../test-helpers.ts';
import type { TestContext } from '../test-helpers.ts';

let t: TestContext;

beforeEach(async () => {
  t = await createTestApp();
});

afterEach(async () => {
  await t.stop();
});

describe('GET /api/catalogue', () => {
  it('returns the seeded canonical entries', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue' });
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
  });

  it('filters by namespace', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue?namespace=custom' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ entries: [] });
  });

  it('filters by kind', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue?kind=geo' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { entries: { kind: string }[] };
    expect(body.entries.every((e) => e.kind === 'geo')).toBe(true);
  });
});

describe('GET /api/catalogue/:id', () => {
  it('returns a canonical entry', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue/heart_rate' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ id: 'heart_rate', kind: 'numeric', unit: 'bpm' });
  });

  it('returns 404 for unknown entries', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/catalogue/does_not_exist' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /api/catalogue/custom', () => {
  it('registers a vendor-namespaced custom numeric entry', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        unit: 'score',
        description: 'Garmin stress score (0–100)',
        shape: { range: { min: 0, max: 100 } },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toMatchObject({
      id: 'garmin.stress_score',
      namespace: 'custom',
      kind: 'numeric',
      unit: 'score',
    });
  });

  it('rejects collisions with canonical entries', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      payload: { id: 'foo.bar', kind: 'numeric', unit: 'x' },
    });
    // First registration succeeds
    expect(res.statusCode).toBe(201);

    const dup = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      payload: { id: 'foo.bar', kind: 'numeric', unit: 'x' },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects non-vendor-namespaced ids', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      payload: { id: 'no_namespace', kind: 'numeric', unit: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/catalogue/aliases', () => {
  it('registers an alias and resolves it on subsequent lookups', async () => {
    const create = await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      payload: { alias: 'apple.heart_rate', canonical_id: 'heart_rate' },
    });
    expect(create.statusCode).toBe(201);

    const list = await t.inject({ method: 'GET', url: '/api/catalogue/aliases' });
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
      payload: { alias: 'vendor.x', canonical_id: 'does_not_exist' },
    });
    expect(res.statusCode).toBe(404);
  });
});
