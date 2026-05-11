import { motion } from './theme.motion.ts';
import { tokens } from './theme.tokens.ts';
import { typography } from './theme.typography.ts';

import type { DurationName, EasingName, Motion } from './theme.motion.ts';
import type { Intent, Tokens } from './theme.tokens.ts';
import type { TypeRole, TypeRoleName, Typography } from './theme.typography.ts';

/**
 * The Aurora design system.
 *
 * Five principles, in order. The order matters — each one is a lens you
 * read the next through.
 *
 *  1. Journey — Health is a path, not a score. Every screen acknowledges
 *     the user's continuity. A number is a stop, not a destination.
 *  2. Hush    — Quiet by default. The screen exhales before it inhales.
 *  3. Glow    — Color is meaning. Light is signal.
 *  4. Lift    — Depth via motion, not weight. Reveal, don't decorate.
 *  5. Trace   — Every number has a shape. A metric without a line is half
 *     a sentence.
 */
const theme = {
  tokens,
  typography,
  motion,
} as const;

type Theme = {
  tokens: Tokens;
  typography: Typography;
  motion: Motion;
};

export type {
  DurationName,
  EasingName,
  Intent,
  Theme,
  TypeRole,
  TypeRoleName,
};
export { theme };
