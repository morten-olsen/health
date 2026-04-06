import type { Migration } from "kysely";

import * as m001Initial from "./001-initial.js";

const migrations: Record<string, Migration> = {
  "001-initial": m001Initial,
};

export { migrations };
