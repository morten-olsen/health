/**
 * Aurora — design tokens.
 *
 * Surface tokens are the only ones with "neutral" intent. Everything else
 * is semantic — color is signal, never decoration.
 */

const palette = {
  graphite: {
    0: '#070809',
    50: '#0A0B0E',
    100: '#101217',
    200: '#161922',
    300: '#1E222C',
    400: '#272C38',
    500: '#3A4051',
    600: '#5A6178',
    700: '#8189A0',
    800: '#B4BACC',
    900: '#E2E5EE',
    1000: '#F4F5F9',
  },
  paper: '#F2EFE9',
  paperDim: 'rgba(242, 239, 233, 0.72)',
  paperFaint: 'rgba(242, 239, 233, 0.48)',
  paperHush: 'rgba(242, 239, 233, 0.24)',
  paperWhisper: 'rgba(242, 239, 233, 0.10)',
  glow: {
    aurora: '#7FE7B5',
    auroraDeep: '#3FBE85',
    tide: '#7BB9FF',
    tideDeep: '#4F8FE3',
    plasma: '#A88BFF',
    plasmaDeep: '#7A5EE3',
    solar: '#FFB36B',
    solarDeep: '#E08838',
    ember: '#FF7B7B',
    emberDeep: '#D94F4F',
  },
} as const;

/**
 * Semantic intent. Use these in components — never reach into `palette` directly
 * unless you are documenting tokens themselves.
 */
const intent = {
  rest: palette.glow.tide,
  restDeep: palette.glow.tideDeep,
  recover: palette.glow.aurora,
  recoverDeep: palette.glow.auroraDeep,
  strain: palette.glow.plasma,
  strainDeep: palette.glow.plasmaDeep,
  notice: palette.glow.solar,
  noticeDeep: palette.glow.solarDeep,
  alert: palette.glow.ember,
  alertDeep: palette.glow.emberDeep,
} as const;

const surface = {
  abyss: palette.graphite[0],
  base: palette.graphite[50],
  raised: palette.graphite[100],
  card: palette.graphite[200],
  cardRaised: palette.graphite[300],
  edge: palette.graphite[400],
  hairline: 'rgba(242, 239, 233, 0.06)',
  hairlineStrong: 'rgba(242, 239, 233, 0.12)',
} as const;

const ink = {
  primary: palette.paper,
  secondary: palette.paperDim,
  tertiary: palette.paperFaint,
  quaternary: palette.paperHush,
  ghost: palette.paperWhisper,
  inverse: palette.graphite[50],
} as const;

const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  '2xl': 32,
  pill: 999,
} as const;

/**
 * Spacing follows a soft progression — not a strict 4/8 grid. Tighter at
 * small scale (where it reads as breath), looser at large (where it reads
 * as composition).
 */
const space = {
  0: 0,
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 48,
  11: 64,
  12: 80,
  13: 112,
} as const;

/**
 * Shadows are soft, layered, and bluish — they read as ambient light, not
 * weight. Use sparingly; depth is mostly carried by surface tone.
 */
const shadow = {
  hush: '0 1px 2px rgba(7, 8, 9, 0.32), 0 0 0 0.5px rgba(242, 239, 233, 0.04)',
  lift: '0 8px 24px -8px rgba(7, 8, 9, 0.5), 0 2px 6px rgba(7, 8, 9, 0.3)',
  float: '0 24px 48px -16px rgba(7, 8, 9, 0.6), 0 8px 16px -4px rgba(7, 8, 9, 0.4)',
  glow: '0 0 32px -4px rgba(127, 231, 181, 0.4)',
} as const;

const tokens = {
  palette,
  intent,
  surface,
  ink,
  radius,
  space,
  shadow,
} as const;

type Tokens = typeof tokens;
type Intent = keyof typeof intent;

export type { Tokens, Intent };
export { tokens };
