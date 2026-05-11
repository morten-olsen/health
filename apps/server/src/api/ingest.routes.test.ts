import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DatabaseService } from '../database/database.ts';
import { createTestApp } from '../test-helpers.ts';
import type { AuthedUser, TestContext } from '../test-helpers.ts';

let t: TestContext;
let admin: AuthedUser;

const garminSource = { integration: 'gadgetbridge', device: 'garmin_fenix_7' } as const;

type IngestResult = {
  statusCode: number;
  body: { results: { idempotency_key: string; status: string; id?: string; reason?: string }[] };
};

const ingestAs = async (user: AuthedUser, items: unknown[], source: object = garminSource): Promise<IngestResult> => {
  const res = await t.inject({
    method: 'POST',
    url: '/api/ingest',
    headers: user.headers,
    payload: { source, items },
  });
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
};

const ingest = (items: unknown[], source?: object): Promise<IngestResult> => ingestAs(admin, items, source);

beforeEach(async () => {
  t = await createTestApp();
  admin = await t.loginAdmin();
});

afterEach(async () => {
  await t.stop();
});

describe('POST /api/ingest — sample items', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await t.inject({
      method: 'POST',
      url: '/api/ingest',
      payload: { source: garminSource, items: [] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts a valid numeric heart-rate sample (bare-value wire)', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'gb-hr-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        tz: 'Europe/Copenhagen',
        value: 142,
      },
    ]);
    expect(result.statusCode).toBe(200);
    expect(result.body.results[0]?.status).toBe('accepted');
    expect(result.body.results[0]?.id).toBeDefined();
  });

  it('rejects an unknown metric', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'k1',
        metric: 'garmin.stress_score',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 50,
      },
    ]);
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('unknown_metric');
  });

  it('rejects a numeric value outside the catalogue range', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'k2',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 5000,
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('out_of_range');
  });

  it('rejects a numeric value of the wrong type', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'k2b',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: '142',
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('schema_mismatch');
  });

  it('rejects a categorical value not in the allowed set', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'k3',
        metric: 'sleep_stage',
        start: '2026-05-09T23:00:00Z',
        end: '2026-05-09T23:30:00Z',
        value: 'snoring',
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('schema_mismatch');
  });

  it('accepts a categorical value (bare string wire)', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'k3-good',
        metric: 'sleep_stage',
        start: '2026-05-09T23:00:00Z',
        end: '2026-05-09T23:30:00Z',
        value: 'deep',
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('accepts a geo sample', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'gps-1',
        metric: 'location',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { lat: 55.6761, lng: 12.5683, accuracy: 5 },
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a geo sample with invalid coordinates', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'gps-2',
        metric: 'location',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { lat: 200, lng: 0 },
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('out_of_range');
  });

  it('accepts a composite blood-pressure sample (bare values, no `values` wrapper)', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'bp-1',
        metric: 'blood_pressure',
        start: '2026-05-09T08:00:00Z',
        end: '2026-05-09T08:00:00Z',
        value: { systolic: 120, diastolic: 80 },
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a composite sample with a missing component', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'bp-2',
        metric: 'blood_pressure',
        start: '2026-05-09T08:00:00Z',
        end: '2026-05-09T08:00:00Z',
        value: { systolic: 120 },
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('missing_field');
  });

  it('rejects when end is before start', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'ts-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:05:00Z',
        end: '2026-05-09T17:00:00Z',
        value: 80,
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('invalid_timestamp');
  });
});

describe('POST /api/ingest — sessions, events, annotations', () => {
  it('accepts a run session', async () => {
    const result = await ingest([
      {
        type: 'session',
        idempotency_key: 'run-1',
        session_type: 'run',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
        metadata: { perceived_exertion: 7 },
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a session referencing a non-session catalogue entry', async () => {
    const result = await ingest([
      {
        type: 'session',
        idempotency_key: 'bad-1',
        session_type: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('invalid_value_kind');
  });

  it('accepts a medication event with unit-as-data', async () => {
    const result = await ingest([
      {
        type: 'event',
        idempotency_key: 'med-1',
        metric: 'medication_taken',
        at: '2026-05-09T08:00:00Z',
        payload: { name: 'ibuprofen', dose_amount: 400, dose_unit: 'mg' },
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a medication event missing the required name field', async () => {
    const result = await ingest([
      {
        type: 'event',
        idempotency_key: 'med-bad-1',
        metric: 'medication_taken',
        at: '2026-05-09T08:00:00Z',
        payload: { dose_amount: 400, dose_unit: 'mg' },
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('missing_field');
  });

  it('accepts a strength_set event (weight in catalogue-declared kg, no weight_unit field)', async () => {
    const result = await ingest([
      {
        type: 'event',
        idempotency_key: 'strength-1',
        metric: 'strength_set',
        at: '2026-05-09T18:15:00Z',
        payload: { exercise: 'back_squat', reps: 5, weight: 100, rpe: 8 },
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a strength_set event with reps outside catalogue range', async () => {
    const result = await ingest([
      {
        type: 'event',
        idempotency_key: 'strength-bad-1',
        metric: 'strength_set',
        at: '2026-05-09T18:15:00Z',
        payload: { exercise: 'back_squat', reps: 0, weight: 100 },
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('out_of_range');
  });

  it('accepts a ranged annotation with tags', async () => {
    const result = await ingest([
      {
        type: 'annotation',
        idempotency_key: 'trip-jp-2026-05',
        start: '2026-05-15T00:00:00Z',
        end: '2026-05-22T00:00:00Z',
        tz: 'Asia/Tokyo',
        text: 'Travelling in Japan — expect HR/sleep anomalies',
        tags: ['travel', 'context'],
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects an annotation with end before start', async () => {
    const result = await ingest([
      {
        type: 'annotation',
        idempotency_key: 'bad-ts',
        start: '2026-05-09T12:00:00Z',
        end: '2026-05-09T11:00:00Z',
        text: 'whoops',
      },
    ]);
    expect(result.body.results[0]?.reason).toBe('invalid_timestamp');
  });
});

describe('POST /api/ingest — idempotency', () => {
  const sample = {
    type: 'sample' as const,
    idempotency_key: 'idemp-1',
    metric: 'heart_rate',
    start: '2026-05-09T17:02:00Z',
    end: '2026-05-09T17:02:00Z',
    value: 80,
  };

  it('returns the same id for an identical retry', async () => {
    const first = await ingest([sample]);
    const second = await ingest([sample]);
    expect(first.body.results[0]?.status).toBe('accepted');
    expect(second.body.results[0]?.status).toBe('accepted');
    expect(first.body.results[0]?.id).toBe(second.body.results[0]?.id);
  });

  it('first-write-wins when a retry uses the same key with a different payload', async () => {
    const first = await ingest([sample]);
    const divergent = await ingest([{ ...sample, value: 99 }]);
    expect(divergent.body.results[0]?.status).toBe('accepted');
    expect(divergent.body.results[0]?.id).toBe(first.body.results[0]?.id);
  });

  it('idempotency is per-user — two users can use the same key for unrelated data', async () => {
    const alice = await t.createUser('alice', 'password-alice');
    const bob = await t.createUser('bob', 'password-bob');

    const aliceRes = await ingestAs(alice, [sample]);
    const bobRes = await ingestAs(bob, [sample]);
    expect(aliceRes.body.results[0]?.status).toBe('accepted');
    expect(bobRes.body.results[0]?.status).toBe('accepted');
    expect(aliceRes.body.results[0]?.id).not.toBe(bobRes.body.results[0]?.id);
  });
});

describe('POST /api/ingest — mixed batches', () => {
  it('returns per-item results in the same order as the request', async () => {
    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'mixed-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 142,
      },
      {
        type: 'sample',
        idempotency_key: 'mixed-2',
        metric: 'totally_unknown',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 1,
      },
      {
        type: 'session',
        idempotency_key: 'mixed-3',
        session_type: 'run',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
      },
    ]);
    expect(result.body.results[0]).toMatchObject({ idempotency_key: 'mixed-1', status: 'accepted' });
    expect(result.body.results[1]).toMatchObject({
      idempotency_key: 'mixed-2',
      status: 'rejected',
      reason: 'unknown_metric',
    });
    expect(result.body.results[2]).toMatchObject({ idempotency_key: 'mixed-3', status: 'accepted' });
  });
});

describe('POST /api/replay', () => {
  it('drains rejected unknown_metric entries after a custom catalogue type is registered', async () => {
    const ingestRejected = await ingest([
      {
        type: 'sample',
        idempotency_key: 'replay-1',
        metric: 'garmin.stress_score',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 42,
      },
    ]);
    expect(ingestRejected.body.results[0]?.status).toBe('rejected');

    const register = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      headers: admin.headers,
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        config: { unit: 'score', range: { min: 0, max: 100 } },
      },
    });
    expect(register.statusCode).toBe(201);

    const replay = await t.inject({
      method: 'POST',
      url: '/api/replay',
      headers: admin.headers,
      payload: { rejection_reason: 'unknown_metric' },
    });
    expect(replay.statusCode).toBe(200);
    expect(JSON.parse(replay.body)).toMatchObject({ attempted: 1, promoted: 1, still_rejected: 0 });
  });

  it('regular user replay scopes to their own data', async () => {
    const alice = await t.createUser('alice', 'password-alice');
    const bob = await t.createUser('bob', 'password-bob');

    await ingestAs(alice, [
      {
        type: 'sample',
        idempotency_key: 'a-1',
        metric: 'unknown.alice',
        start: '2026-05-09T17:00:00Z',
        end: '2026-05-09T17:00:00Z',
        value: 1,
      },
    ]);
    await ingestAs(bob, [
      {
        type: 'sample',
        idempotency_key: 'b-1',
        metric: 'unknown.bob',
        start: '2026-05-09T17:00:00Z',
        end: '2026-05-09T17:00:00Z',
        value: 2,
      },
    ]);

    // Alice replays — she should only see her own one rejected entry
    const aliceReplay = await t.inject({
      method: 'POST',
      url: '/api/replay',
      headers: alice.headers,
      payload: { rejection_reason: 'unknown_metric' },
    });
    expect(aliceReplay.statusCode).toBe(200);
    expect(JSON.parse(aliceReplay.body)).toMatchObject({ attempted: 1, still_rejected: 1 });
  });
});

describe('POST /api/ingest — alias resolution', () => {
  it("treats a user's aliased vendor name as the canonical metric", async () => {
    await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      headers: admin.headers,
      payload: { alias: 'apple.heart_rate', canonical_id: 'heart_rate' },
    });

    const result = await ingest([
      {
        type: 'sample',
        idempotency_key: 'alias-1',
        metric: 'apple.heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: 70,
      },
    ]);
    expect(result.body.results[0]?.status).toBe('accepted');
  });
});

describe('POST /api/ingest — session linkage', () => {
  const sample = (key: string, sessionKey?: string): object => ({
    type: 'sample',
    idempotency_key: key,
    metric: 'heart_rate',
    start: '2026-05-09T17:05:00Z',
    end: '2026-05-09T17:05:00Z',
    value: 142,
    ...(sessionKey ? { session_idempotency_key: sessionKey } : {}),
  });

  const session = (key: string): object => ({
    type: 'session',
    idempotency_key: key,
    session_type: 'run',
    start: '2026-05-09T17:00:00Z',
    end: '2026-05-09T18:00:00Z',
  });

  const fetchSampleByKey = async (
    idempotencyKey: string,
  ): Promise<{ session_key: string | null; session_id: string | null } | undefined> => {
    const db = await t.services.get(DatabaseService).getInstance();
    return db
      .selectFrom('samples')
      .innerJoin('ingest_log', 'ingest_log.id', 'samples.ingest_log_id')
      .select(['samples.session_key', 'samples.session_id'])
      .where('ingest_log.idempotency_key', '=', idempotencyKey)
      .executeTakeFirst();
  };

  it('resolves session_id at publish time when the session is already published', async () => {
    await ingest([session('run-A')]);
    const after = await ingest([sample('s-1', 'run-A')]);
    expect(after.body.results[0]?.status).toBe('accepted');
    const row = await fetchSampleByKey('s-1');
    expect(row?.session_key).toBe('run-A');
    expect(row?.session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('back-fills session_id when the session is published after the sample', async () => {
    await ingest([sample('s-2', 'run-B')]);
    const before = await fetchSampleByKey('s-2');
    expect(before?.session_key).toBe('run-B');
    expect(before?.session_id).toBeNull();

    await ingest([session('run-B')]);
    const after = await fetchSampleByKey('s-2');
    expect(after?.session_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('leaves session_id null when the referenced session does not exist', async () => {
    await ingest([sample('s-3', 'never-published')]);
    const row = await fetchSampleByKey('s-3');
    expect(row?.session_key).toBe('never-published');
    expect(row?.session_id).toBeNull();
  });

  it('does not link across different sources sharing the same key', async () => {
    await ingest([session('run-C')], { integration: 'gadgetbridge', device: 'watch-A' });
    // Same session idempotency_key but a different device — must not resolve.
    await ingest([sample('s-4', 'run-C')], { integration: 'gadgetbridge', device: 'watch-B' });
    const row = await fetchSampleByKey('s-4');
    expect(row?.session_id).toBeNull();
  });

  it('keeps both columns null for samples without a session reference', async () => {
    await ingest([sample('s-5')]);
    const row = await fetchSampleByKey('s-5');
    expect(row?.session_key).toBeNull();
    expect(row?.session_id).toBeNull();
  });
});
