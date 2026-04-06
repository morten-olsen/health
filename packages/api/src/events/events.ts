import { eventInputSchema } from "@morten-olsen/health-contracts";
import type { EventInput } from "@morten-olsen/health-contracts";

import type { Services } from "../services/services.js";
import { DatabaseService } from "../db/db.js";

class EventService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  create = async (input: EventInput): Promise<{ id: string }> => {
    const validated = eventInputSchema.parse(input);
    const db = this.#services.get(DatabaseService).get();

    const [row] = await db
      .insertInto("events")
      .values({
        time: new Date(validated.time),
        category: validated.category,
        label: validated.label,
        metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
      })
      .returning("id")
      .execute();

    return { id: row!.id };
  };

  query = async (input: { category?: string; from: string; to: string }): Promise<Array<{
    id: string;
    time: string;
    category: string;
    label: string;
    metadata: unknown;
  }>> => {
    const db = this.#services.get(DatabaseService).get();

    let query = db
      .selectFrom("events")
      .selectAll()
      .where("time", ">=", new Date(input.from))
      .where("time", "<=", new Date(input.to))
      .orderBy("time", "asc");

    if (input.category) {
      query = query.where("category", "=", input.category);
    }

    const rows = await query.execute();

    return rows.map((row) => ({
      id: row.id,
      time: row.time.toISOString(),
      category: row.category,
      label: row.label,
      metadata: row.metadata,
    }));
  };
}

export { EventService };
