import { DatabaseService } from '../database/database.ts';
import type { UserDevicesTable } from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import type { DeviceResponse } from './devices.schemas.ts';

class DeviceAlreadyExistsError extends Error {
  constructor(integration: string, deviceId: string) {
    super(`Device already registered: ${integration}/${deviceId}`);
    this.name = 'DeviceAlreadyExistsError';
  }
}

const toResponse = (row: UserDevicesTable): DeviceResponse => ({
  id: row.id,
  integration: row.integration,
  device_id: row.device_id,
  name: row.name,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

class DevicesService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  // Strict create. Integrations are expected to list first (or check by-source)
  // and only call register when they know the device is missing — throwing on
  // conflict surfaces accidental double-registration rather than silently
  // overwriting a user-chosen name.
  register = async (input: {
    userId: string;
    integration: string;
    deviceId: string;
    name: string;
  }): Promise<DeviceResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const existing = await db
      .selectFrom('user_devices')
      .select('id')
      .where('user_id', '=', input.userId)
      .where('integration', '=', input.integration)
      .where('device_id', '=', input.deviceId)
      .executeTakeFirst();
    if (existing) {
      throw new DeviceAlreadyExistsError(input.integration, input.deviceId);
    }
    const now = new Date().toISOString();
    const row: UserDevicesTable = {
      id: crypto.randomUUID(),
      user_id: input.userId,
      integration: input.integration,
      device_id: input.deviceId,
      name: input.name,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('user_devices').values(row).execute();
    return toResponse(row);
  };

  listForUser = async (userId: string): Promise<DeviceResponse[]> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const rows = await db
      .selectFrom('user_devices')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('created_at', 'desc')
      .execute();
    return rows.map(toResponse);
  };

  updateName = async (userId: string, id: string, name: string): Promise<DeviceResponse | null> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const now = new Date().toISOString();
    const result = await db
      .updateTable('user_devices')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .set({ name, updated_at: now })
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) {
      return null;
    }
    const row = await db.selectFrom('user_devices').selectAll().where('id', '=', id).executeTakeFirst();
    return row ? toResponse(row) : null;
  };
}

export { DeviceAlreadyExistsError, DevicesService };
