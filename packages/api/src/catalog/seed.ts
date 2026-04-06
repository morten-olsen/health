import type { MetricCatalogEntry } from "@morten-olsen/health-contracts";

/**
 * Starter set of common health metrics.
 * Run via `pnpm seed` or import into a custom seed script.
 */
const seedMetrics: MetricCatalogEntry[] = [
  // ── Cardiovascular ──────────────────────────────────────────────────────
  {
    slug: "heart_rate",
    name: "Heart Rate",
    unit: "bpm",
    valueType: "numeric",
    validRange: [20, 250],
    aggregations: ["avg", "min", "max"],
    category: "cardiovascular",
  },
  {
    slug: "resting_heart_rate",
    name: "Resting Heart Rate",
    unit: "bpm",
    valueType: "numeric",
    validRange: [25, 120],
    aggregations: ["avg", "min", "max"],
    category: "cardiovascular",
  },
  {
    slug: "hrv",
    name: "Heart Rate Variability",
    unit: "ms",
    valueType: "numeric",
    validRange: [0, 300],
    aggregations: ["avg", "min", "max"],
    category: "cardiovascular",
  },

  // ── Respiratory / Blood ─────────────────────────────────────────────────
  {
    slug: "spo2",
    name: "Blood Oxygen Saturation",
    unit: "%",
    valueType: "numeric",
    validRange: [70, 100],
    aggregations: ["avg", "min", "max"],
    category: "respiratory",
  },
  {
    slug: "respiratory_rate",
    name: "Respiratory Rate",
    unit: "brpm",
    valueType: "numeric",
    validRange: [4, 60],
    aggregations: ["avg", "min", "max"],
    category: "respiratory",
  },

  // ── Sleep ───────────────────────────────────────────────────────────────
  {
    slug: "sleep_score",
    name: "Sleep Score",
    unit: "score",
    valueType: "numeric",
    validRange: [0, 100],
    aggregations: ["avg", "last"],
    category: "sleep",
  },
  {
    slug: "sleep_duration",
    name: "Sleep Duration",
    unit: "seconds",
    valueType: "numeric",
    validRange: [0, 86400],
    aggregations: ["sum", "avg"],
    category: "sleep",
  },
  {
    slug: "sleep_stages",
    name: "Sleep Stages",
    unit: "stages",
    valueType: "json",
    aggregations: ["last"],
    category: "sleep",
  },

  // ── Activity ────────────────────────────────────────────────────────────
  {
    slug: "steps",
    name: "Steps",
    unit: "steps",
    valueType: "numeric",
    validRange: [0, 100000],
    aggregations: ["sum", "avg", "max"],
    category: "activity",
  },
  {
    slug: "active_calories",
    name: "Active Calories",
    unit: "kcal",
    valueType: "numeric",
    validRange: [0, 10000],
    aggregations: ["sum", "avg"],
    category: "activity",
  },
  {
    slug: "vo2max",
    name: "VO2 Max",
    unit: "ml/kg/min",
    valueType: "numeric",
    validRange: [10, 90],
    aggregations: ["last", "avg"],
    category: "fitness",
  },

  // ── Body ────────────────────────────────────────────────────────────────
  {
    slug: "weight",
    name: "Weight",
    unit: "kg",
    valueType: "numeric",
    validRange: [20, 300],
    aggregations: ["last", "avg"],
    category: "body",
  },
  {
    slug: "body_temperature",
    name: "Body Temperature",
    unit: "°C",
    valueType: "numeric",
    validRange: [34, 42],
    aggregations: ["avg", "min", "max"],
    category: "body",
  },
];

export { seedMetrics };
