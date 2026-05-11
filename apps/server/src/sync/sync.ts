import { sql } from 'kysely';
import type { Kysely } from 'kysely';

import { DatabaseService } from '../database/database.ts';
import type { DatabaseSchema } from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import type { HighWaterMark, SyncLatestQuery, SyncLatestResponse } from './sync.schemas.ts';

type Db = Kysely<DatabaseSchema>;

const samplesHwm = async (db: Db, userId: string, filter: SyncLatestQuery): Promise<HighWaterMark[]> => {
  let q = db
    .selectFrom('samples')
    .select(['source_integration', 'source_device'])
    .select('metric_id as metric')
    .select(sql<string>`max(start_at)`.as('latest_at'))
    .where('user_id', '=', userId)
    .groupBy(['source_integration', 'source_device', 'metric_id']);
  if (filter.source_integration) {
    q = q.where('source_integration', '=', filter.source_integration);
  }
  if (filter.source_device) {
    q = q.where('source_device', '=', filter.source_device);
  }
  return (await q.execute()) as HighWaterMark[];
};

const eventsHwm = async (db: Db, userId: string, filter: SyncLatestQuery): Promise<HighWaterMark[]> => {
  let q = db
    .selectFrom('events')
    .select(['source_integration', 'source_device'])
    .select('metric_id as metric')
    .select(sql<string>`max(at)`.as('latest_at'))
    .where('user_id', '=', userId)
    .groupBy(['source_integration', 'source_device', 'metric_id']);
  if (filter.source_integration) {
    q = q.where('source_integration', '=', filter.source_integration);
  }
  if (filter.source_device) {
    q = q.where('source_device', '=', filter.source_device);
  }
  return (await q.execute()) as HighWaterMark[];
};

const sessionsHwm = async (db: Db, userId: string, filter: SyncLatestQuery): Promise<HighWaterMark[]> => {
  let q = db
    .selectFrom('sessions')
    .select(['source_integration', 'source_device'])
    .select('session_type as metric')
    .select(sql<string>`max(start_at)`.as('latest_at'))
    .where('user_id', '=', userId)
    .groupBy(['source_integration', 'source_device', 'session_type']);
  if (filter.source_integration) {
    q = q.where('source_integration', '=', filter.source_integration);
  }
  if (filter.source_device) {
    q = q.where('source_device', '=', filter.source_device);
  }
  return (await q.execute()) as HighWaterMark[];
};

class SyncService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  latest = async (userId: string, filter: SyncLatestQuery): Promise<SyncLatestResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const [samples, events, sessions] = await Promise.all([
      samplesHwm(db, userId, filter),
      eventsHwm(db, userId, filter),
      sessionsHwm(db, userId, filter),
    ]);
    return { samples, events, sessions };
  };
}

export { SyncService };
