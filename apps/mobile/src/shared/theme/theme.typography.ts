/**
 * Type system.
 *
 * Two families, deliberately matched:
 *  - `display` — Fraunces (variable serif, OPSZ + SOFT axes). Used for hero
 *    numerals, editorial moments, and any number that wants to be read as
 *    a *shape* rather than a digit.
 *  - `text` — Geist. Clean, geometric, with the cleanest tabular figures of
 *    any open sans. Everything functional.
 *  - `mono` — Geist Mono. Timestamps, micro-data, technical labels.
 *
 * The scale is humanist, not modular — each step has a job, not a ratio.
 */

const family = {
  display: '"Fraunces", "Iowan Old Style", Georgia, serif',
  text: '"Geist", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"Geist Mono", "SF Mono", ui-monospace, monospace',
} as const;

const weight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Variable-font axis settings for Fraunces. SOFT 100 = warmer, more humanist;
 * OPSZ tracks the rendered size for proper optical sizing.
 */
const fraunces = {
  hero: '"opsz" 144, "SOFT" 100, "wght" 400',
  display: '"opsz" 96, "SOFT" 80, "wght" 400',
  heading: '"opsz" 32, "SOFT" 60, "wght" 500',
  numeric: '"opsz" 96, "SOFT" 30, "wght" 350',
} as const;

type TypeRole = {
  family: string;
  size: number;
  lineHeight: number;
  letterSpacing: number;
  weight: string;
  fontVariationSettings?: string;
};

/**
 * Roles, not sizes. A "hero-numeral" is always the giant metric value at
 * the top of a glance card — never used decoratively elsewhere.
 */
const role = {
  /** The giant metric value. Single use per screen, maximum. */
  heroNumeral: {
    family: family.display,
    size: 96,
    lineHeight: 96,
    letterSpacing: -3,
    weight: weight.regular,
    fontVariationSettings: fraunces.numeric,
  },
  /** Section-defining metric. Multiple per screen okay, but sparingly. */
  bigNumeral: {
    family: family.display,
    size: 56,
    lineHeight: 60,
    letterSpacing: -1.5,
    weight: weight.regular,
    fontVariationSettings: fraunces.numeric,
  },
  /** Inline metric inside a card or pill. */
  numeral: {
    family: family.display,
    size: 28,
    lineHeight: 32,
    letterSpacing: -0.4,
    weight: weight.medium,
    fontVariationSettings: fraunces.heading,
  },
  /** Editorial title — page headers, "Today", "Sleep". */
  display: {
    family: family.display,
    size: 40,
    lineHeight: 44,
    letterSpacing: -1.2,
    weight: weight.regular,
    fontVariationSettings: fraunces.display,
  },
  /** Section heading. */
  heading: {
    family: family.text,
    size: 22,
    lineHeight: 28,
    letterSpacing: -0.4,
    weight: weight.semibold,
  },
  /** Card title, list item title. */
  title: {
    family: family.text,
    size: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    weight: weight.semibold,
  },
  /** Default body. */
  body: {
    family: family.text,
    size: 15,
    lineHeight: 22,
    letterSpacing: -0.05,
    weight: weight.regular,
  },
  /** Secondary body — captions, supporting text. */
  caption: {
    family: family.text,
    size: 13,
    lineHeight: 18,
    letterSpacing: 0,
    weight: weight.regular,
  },
  /** Uppercase eyebrow — labels above headings, section markers. */
  eyebrow: {
    family: family.text,
    size: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    weight: weight.semibold,
  },
  /** Smallest readable — micro labels, timestamps. */
  micro: {
    family: family.text,
    size: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
    weight: weight.medium,
  },
  /** Data — timestamps, codes, anything technical. */
  mono: {
    family: family.mono,
    size: 12,
    lineHeight: 16,
    letterSpacing: 0,
    weight: weight.regular,
  },
} as const satisfies Record<string, TypeRole>;

const typography = {
  family,
  weight,
  fraunces,
  role,
} as const;

type Typography = typeof typography;
type TypeRoleName = keyof typeof role;

export type { Typography, TypeRole, TypeRoleName };
export { typography };
