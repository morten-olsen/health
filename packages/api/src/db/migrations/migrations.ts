import type { Migration } from "kysely";

import * as m001Initial from "./001-initial.js";
import * as m002DedupConstraints from "./002-dedup-constraints.js";
import * as m003FixPartialIndexes from "./003-fix-partial-indexes.js";

const migrations: Record<string, Migration> = {
  "001-initial": m001Initial,
  "002-dedup-constraints": m002DedupConstraints,
  "003-fix-partial-indexes": m003FixPartialIndexes,
};

export { migrations };
