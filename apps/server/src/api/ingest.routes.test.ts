import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../test-helpers.ts';
import type { TestContext } from '../test-helpers.ts';

let t: TestContext;

const garminSource = { integration: 'gadgetbridge', device: 'garmin_fenix_7' } as const;

const ingest = async (items: unknown[], source: object = garminSource): Promise<unknown> => {
  const res = await t.inject({
    method: 'POST',
    url: '/api/ingest',
    payload: { source, items },
  });
  return { statusCode: res.statusCode, body: JSON.parse(res.body) };
};

beforeEach(async () => {
  t = await createTestApp();
});

afterEach(async () => {
  await t.stop();
});

describe('POST /api/ingest — sample items', () => {
  it('accepts a valid numeric heart-rate sample', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'gb-hr-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        tz: 'Europe/Copenhagen',
        value: { value: 142, unit: 'bpm' },
      },
    ])) as { statusCode: number; body: { results: { status: string; id?: string }[] } };
    expect(result.statusCode).toBe(200);
    expect(result.body.results[0]?.status).toBe('accepted');
    expect(result.body.results[0]?.id).toBeDefined();
  });

  it('rejects an unknown metric', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'k1',
        metric: 'garmin.stress_score',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 50 },
      },
    ])) as { statusCode: number; body: { results: { status: string; reason?: string }[] } };
    expect(result.statusCode).toBe(200);
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('unknown_metric');
  });

  it('rejects a value outside the catalogue range', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'k2',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 5000, unit: 'bpm' },
      },
    ])) as { statusCode: number; body: { results: { status: string; reason?: string }[] } };
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('out_of_range');
  });

  it('rejects a categorical value not in the allowed set', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'k3',
        metric: 'sleep_stage',
        start: '2026-05-09T23:00:00Z',
        end: '2026-05-09T23:30:00Z',
        value: { value: 'snoring' },
      },
    ])) as { statusCode: number; body: { results: { status: string; reason?: string }[] } };
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('schema_mismatch');
  });

  it('accepts a geo sample', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'gps-1',
        metric: 'location',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { lat: 55.6761, lng: 12.5683, accuracy: 5 },
      },
    ])) as { statusCode: number; body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a geo sample with invalid coordinates', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'gps-2',
        metric: 'location',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { lat: 200, lng: 0 },
      },
    ])) as { statusCode: number; body: { results: { status: string; reason?: string }[] } };
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('schema_mismatch');
  });

  it('accepts a composite blood-pressure sample', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'bp-1',
        metric: 'blood_pressure',
        start: '2026-05-09T08:00:00Z',
        end: '2026-05-09T08:00:00Z',
        value: { values: { systolic: 120, diastolic: 80 } },
      },
    ])) as { statusCode: number; body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects when end is before start', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'ts-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:05:00Z',
        end: '2026-05-09T17:00:00Z',
        value: { value: 80 },
      },
    ])) as { statusCode: number; body: { results: { reason?: string }[] } };
    expect(result.body.results[0]?.reason).toBe('invalid_timestamp');
  });
});

describe('POST /api/ingest — sessions and events', () => {
  it('accepts a run session', async () => {
    const result = (await ingest([
      {
        type: 'session',
        idempotency_key: 'run-1',
        session_type: 'run',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
        metadata: { perceived_exertion: 7 },
      },
    ])) as { statusCode: number; body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects a session referencing a non-session catalogue entry', async () => {
    const result = (await ingest([
      {
        type: 'session',
        idempotency_key: 'bad-1',
        session_type: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
      },
    ])) as { statusCode: number; body: { results: { reason?: string }[] } };
    expect(result.body.results[0]?.reason).toBe('invalid_value_kind');
  });

  it('accepts a medication event', async () => {
    const result = (await ingest([
      {
        type: 'event',
        idempotency_key: 'med-1',
        metric: 'medication_taken',
        at: '2026-05-09T08:00:00Z',
        payload: { name: 'ibuprofen', dose_mg: 400 },
      },
    ])) as { statusCode: number; body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });
});

describe('POST /api/ingest — annotations', () => {
  it('accepts a ranged annotation with tags', async () => {
    const result = (await ingest([
      {
        type: 'annotation',
        idempotency_key: 'trip-jp-2026-05',
        start: '2026-05-15T00:00:00Z',
        end: '2026-05-22T00:00:00Z',
        tz: 'Asia/Tokyo',
        text: 'Travelling in Japan — expect HR/sleep anomalies',
        tags: ['travel', 'context'],
      },
    ])) as { statusCode: number; body: { results: { status: string; id?: string }[] } };
    expect(result.statusCode).toBe(200);
    expect(result.body.results[0]?.status).toBe('accepted');
    expect(result.body.results[0]?.id).toBeDefined();
  });

  it('accepts an instantaneous annotation (start == end)', async () => {
    const result = (await ingest([
      {
        type: 'annotation',
        idempotency_key: 'calib-1',
        start: '2026-05-09T08:00:00Z',
        end: '2026-05-09T08:00:00Z',
        text: 'Calibrated scale; tare offset reset.',
      },
    ])) as { body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });

  it('rejects an annotation with end before start', async () => {
    const result = (await ingest([
      {
        type: 'annotation',
        idempotency_key: 'bad-ts',
        start: '2026-05-09T12:00:00Z',
        end: '2026-05-09T11:00:00Z',
        text: 'whoops',
      },
    ])) as { body: { results: { status: string; reason?: string }[] } };
    expect(result.body.results[0]?.status).toBe('rejected');
    expect(result.body.results[0]?.reason).toBe('invalid_timestamp');
  });

  it('does not require any catalogue entry', async () => {
    // Annotations are free-form context; no catalogue lookup happens.
    const result = (await ingest([
      {
        type: 'annotation',
        idempotency_key: 'no-cat-1',
        start: '2026-05-09T00:00:00Z',
        end: '2026-05-09T00:00:00Z',
        text: 'Whatever I want to note here',
        tags: ['totally', 'made', 'up'],
      },
    ])) as { body: { results: { status: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });
});

describe('POST /api/ingest — idempotency', () => {
  const sample = {
    type: 'sample' as const,
    idempotency_key: 'idemp-1',
    metric: 'heart_rate',
    start: '2026-05-09T17:02:00Z',
    end: '2026-05-09T17:02:00Z',
    value: { value: 80, unit: 'bpm' },
  };

  it('returns the same id for an identical retry', async () => {
    const first = (await ingest([sample])) as { body: { results: { status: string; id?: string }[] } };
    const second = (await ingest([sample])) as { body: { results: { status: string; id?: string }[] } };
    expect(first.body.results[0]?.status).toBe('accepted');
    expect(second.body.results[0]?.status).toBe('accepted');
    expect(first.body.results[0]?.id).toBe(second.body.results[0]?.id);
  });

  it('first-write-wins when a retry uses the same key with a different payload', async () => {
    const first = (await ingest([sample])) as { body: { results: { status: string; id?: string }[] } };
    const divergent = (await ingest([{ ...sample, value: { value: 99, unit: 'bpm' } }])) as {
      body: { results: { status: string; id?: string }[] };
    };
    // Same id returned — original payload is the source of truth, divergence
    // is logged server-side rather than surfaced as a distinct status.
    expect(divergent.body.results[0]?.status).toBe('accepted');
    expect(divergent.body.results[0]?.id).toBe(first.body.results[0]?.id);
  });
});

describe('POST /api/ingest — mixed batches', () => {
  it('returns per-item results in the same order as the request', async () => {
    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'mixed-1',
        metric: 'heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 142, unit: 'bpm' },
      },
      {
        type: 'sample',
        idempotency_key: 'mixed-2',
        metric: 'totally_unknown',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 1 },
      },
      {
        type: 'session',
        idempotency_key: 'mixed-3',
        session_type: 'run',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:48:00Z',
      },
    ])) as { body: { results: { idempotency_key: string; status: string; reason?: string }[] } };
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
    const ingestRejected = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'replay-1',
        metric: 'garmin.stress_score',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 42 },
      },
    ])) as { body: { results: { status: string; reason?: string }[] } };
    expect(ingestRejected.body.results[0]?.status).toBe('rejected');

    const register = await t.inject({
      method: 'POST',
      url: '/api/catalogue/custom',
      payload: {
        id: 'garmin.stress_score',
        kind: 'numeric',
        unit: 'score',
        shape: { range: { min: 0, max: 100 } },
      },
    });
    expect(register.statusCode).toBe(201);

    const replay = await t.inject({
      method: 'POST',
      url: '/api/replay',
      payload: { rejection_reason: 'unknown_metric' },
    });
    expect(replay.statusCode).toBe(200);
    expect(JSON.parse(replay.body)).toMatchObject({ attempted: 1, promoted: 1, still_rejected: 0 });
  });
});

describe('POST /api/ingest — alias resolution', () => {
  it('treats an aliased vendor name as the canonical metric', async () => {
    await t.inject({
      method: 'POST',
      url: '/api/catalogue/aliases',
      payload: { alias: 'apple.heart_rate', canonical_id: 'heart_rate' },
    });

    const result = (await ingest([
      {
        type: 'sample',
        idempotency_key: 'alias-1',
        metric: 'apple.heart_rate',
        start: '2026-05-09T17:02:00Z',
        end: '2026-05-09T17:02:00Z',
        value: { value: 70, unit: 'bpm' },
      },
    ])) as { body: { results: { status: string; id?: string }[] } };
    expect(result.body.results[0]?.status).toBe('accepted');
  });
});
