import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../test-helpers.ts';
import type { AuthedUser, TestContext } from '../test-helpers.ts';

let t: TestContext;
let admin: AuthedUser;

type Hwm = { source_integration: string; source_device: string; metric: string; latest_at: string };
type SyncLatest = { samples: Hwm[]; events: Hwm[]; sessions: Hwm[] };

const watchA = { integration: 'gadgetbridge', device: 'AA:00' } as const;
const watchB = { integration: 'gadgetbridge', device: 'BB:00' } as const;

const ingestAs = async (user: AuthedUser, items: unknown[], source: object): Promise<void> => {
  const res = await t.inject({
    method: 'POST',
    url: '/api/ingest',
    headers: user.headers,
    payload: { source, items },
  });
  if (res.statusCode !== 200) {
    throw new Error(`ingest failed: ${res.statusCode} ${res.body}`);
  }
};

const fetchLatest = async (user: AuthedUser, query: Record<string, string> = {}): Promise<SyncLatest> => {
  const qs = new URLSearchParams(query).toString();
  const url = qs ? `/api/sync/latest?${qs}` : '/api/sync/latest';
  const res = await t.inject({ method: 'GET', url, headers: user.headers });
  expect(res.statusCode).toBe(200);
  return JSON.parse(res.body) as SyncLatest;
};

const hrSample = (key: string, atIso: string): object => ({
  type: 'sample',
  idempotency_key: key,
  metric: 'heart_rate',
  start: atIso,
  end: atIso,
  value: 70,
});

beforeEach(async () => {
  t = await createTestApp();
  admin = await t.loginAdmin();
});

afterEach(async () => {
  await t.stop();
});

describe('GET /api/sync/latest', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await t.inject({ method: 'GET', url: '/api/sync/latest' });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty groups when the user has no data', async () => {
    const body = await fetchLatest(admin);
    expect(body).toEqual({ samples: [], events: [], sessions: [] });
  });

  it('returns the max start_at per (integration, device, metric)', async () => {
    await ingestAs(admin, [hrSample('a', '2026-05-01T10:00:00Z'), hrSample('b', '2026-05-09T12:00:00Z')], watchA);
    const body = await fetchLatest(admin);
    expect(body.samples).toHaveLength(1);
    expect(body.samples[0]).toMatchObject({
      source_integration: 'gadgetbridge',
      source_device: 'AA:00',
      metric: 'heart_rate',
      latest_at: '2026-05-09T12:00:00Z',
    });
  });

  it('filters by source_integration', async () => {
    await ingestAs(admin, [hrSample('a', '2026-05-01T10:00:00Z')], watchA);
    await ingestAs(admin, [hrSample('b', '2026-05-02T10:00:00Z')], { integration: 'manual', device: 'web' });
    const body = await fetchLatest(admin, { source_integration: 'manual' });
    expect(body.samples).toHaveLength(1);
    expect(body.samples[0]?.source_integration).toBe('manual');
  });

  it('filters by source_device', async () => {
    await ingestAs(admin, [hrSample('a', '2026-05-01T10:00:00Z')], watchA);
    await ingestAs(admin, [hrSample('b', '2026-05-02T10:00:00Z')], watchB);
    const body = await fetchLatest(admin, { source_integration: 'gadgetbridge', source_device: 'BB:00' });
    expect(body.samples).toHaveLength(1);
    expect(body.samples[0]?.source_device).toBe('BB:00');
  });

  it('groups separately for samples, events, and sessions', async () => {
    await ingestAs(
      admin,
      [
        hrSample('s-1', '2026-05-01T10:00:00Z'),
        {
          type: 'event',
          idempotency_key: 'e-1',
          metric: 'medication_taken',
          at: '2026-05-01T08:00:00Z',
          payload: { name: 'ibuprofen' },
        },
        {
          type: 'session',
          idempotency_key: 'ss-1',
          session_type: 'run',
          start: '2026-05-01T17:00:00Z',
          end: '2026-05-01T17:45:00Z',
        },
      ],
      watchA,
    );
    const body = await fetchLatest(admin);
    expect(body.samples).toHaveLength(1);
    expect(body.events).toHaveLength(1);
    expect(body.sessions).toHaveLength(1);
    expect(body.events[0]?.metric).toBe('medication_taken');
    expect(body.sessions[0]?.metric).toBe('run');
  });

  it('scopes results per user', async () => {
    const alice = await t.createUser('alice', 'alice-pw1234');
    await ingestAs(admin, [hrSample('a', '2026-05-01T10:00:00Z')], watchA);
    const body = await fetchLatest(alice);
    expect(body).toEqual({ samples: [], events: [], sessions: [] });
  });
});
