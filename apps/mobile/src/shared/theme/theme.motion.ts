/**
 * Motion vocabulary.
 *
 * Motion in Aurora is breath, not flourish. Every transition is named for the
 * feeling it should leave behind — never for a duration.
 *
 *  - `flick`   — state changes that should feel mechanical (toggles, taps).
 *  - `gentle`  — the default for almost everything. Reveals, dismissals.
 *  - `breath`  — data-bearing reveals (sparklines drawing, rings filling).
 *  - `tide`    — slow ambient pulses (recovery glows, "still here" beats).
 *  - `arrival` — the first time the eye lands on a screen. Hero entrances.
 *
 * Easings are named for shape, not curve. `glide` is the workhorse — a
 * gentle out-curve that lets the eye land softly. `dive` is for departures.
 */

const duration = {
  instant: 0,
  flick: 140,
  gentle: 280,
  breath: 520,
  tide: 1100,
  arrival: 820,
} as const;

const easing = {
  /** Apple-like default. Smooth, balanced, never showy. */
  glide: 'cubic-bezier(0.32, 0.72, 0, 1)',
  /** Entrances — gentle landing, eye-led. */
  arrive: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Exits — quick lift-off. */
  dive: 'cubic-bezier(0.7, 0, 0.84, 0)',
  /** For physical, "stretched-then-released" motion. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Linear — only for true continuous motion (loading shimmer, pulse). */
  steady: 'linear',
} as const;

/**
 * Spring configs for Reanimated. Aurora uses springs sparingly — only where
 * the motion is responding to a gesture or where the data has a "settling"
 * quality (e.g. a number landing on its value).
 */
const spring = {
  /** Toggle thumb, chip select. */
  snappy: { damping: 20, stiffness: 420, mass: 0.6 },
  /** Default soft spring — cards settling, sheets landing. */
  gentle: { damping: 22, stiffness: 200, mass: 0.8 },
  /** The "land" of a value scrubbing into place. */
  settle: { damping: 28, stiffness: 140, mass: 1 },
} as const;

const stagger = {
  /** Default cascade between sibling reveals (e.g. metric cards on home). */
  cascade: 60,
  /** Slower cascade for editorial moments. */
  unfold: 110,
} as const;

const motion = {
  duration,
  easing,
  spring,
  stagger,
} as const;

type Motion = typeof motion;
type DurationName = keyof typeof duration;
type EasingName = keyof typeof easing;

export type { Motion, DurationName, EasingName };
export { motion };
