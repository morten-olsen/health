import type { Migration } from "kysely";

import * as m001Initial from "./001-initial.js";
import * as m002DedupConstraints from "./002-dedup-constraints.js";

const migrations: Record<string, Migration> = {
  "001-initial": m001Initial,
  "002-dedup-constraints": m002DedupConstraints,
};

export { migrations };
