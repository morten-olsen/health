import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type PulseLineTone = Extract<Intent, 'recover' | 'rest' | 'strain' | 'notice' | 'alert'>;

type PulseLineProps = {
  /** Sequence of values. Aurora resamples internally; just hand over the raw shape. */
  values: number[];
  /**
   * Width hint. Omit to make the line fill its parent (SVG scales via viewBox).
   * Provide a number when you need an exact canvas (specimen rows, fixed layouts).
   */
  width?: number;
  height?: number;
  tone?: PulseLineTone;
  /** Optional dot at the latest value. */
  showPoint?: boolean;
  /** Optional area fill under the curve. Quiet by default. */
  showArea?: boolean;
  /** Highlight outlying points (>1 stdev from mean). */
  showOutliers?: boolean;
};

type Point = { x: number; y: number };
type ToneSpec = { stroke: string; deep: string };

const CANVAS_W = 360;
const PAD_Y = 6;
const PAD_X = 8;

const TONE: Record<PulseLineTone, ToneSpec> = {
  recover: { stroke: theme.tokens.intent.recover, deep: theme.tokens.intent.recoverDeep },
  rest: { stroke: theme.tokens.intent.rest, deep: theme.tokens.intent.restDeep },
  strain: { stroke: theme.tokens.intent.strain, deep: theme.tokens.intent.strainDeep },
  notice: { stroke: theme.tokens.intent.notice, deep: theme.tokens.intent.noticeDeep },
  alert: { stroke: theme.tokens.intent.alert, deep: theme.tokens.intent.alertDeep },
};

const catmullRomPath = (points: Point[]): string => {
  const head = points[0];
  if (!head) {
    return '';
  }
  if (points.length === 1) {
    return `M${head.x},${head.y}`;
  }
  const segments: string[] = [`M${head.x},${head.y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i] ?? head;
    const p2 = points[i + 1] ?? p1;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    segments.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return segments.join(' ');
};

const computePoints = (values: number[], height: number): Point[] => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableW = CANVAS_W - PAD_X * 2;
  const usableH = height - PAD_Y * 2;
  return values.map((v, i) => ({
    x: PAD_X + (i / (values.length - 1)) * usableW,
    y: PAD_Y + (1 - (v - min) / range) * usableH,
  }));
};

const pickOutliers = (values: number[], points: Point[]): Point[] => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  const std = Math.sqrt(variance);
  const result: Point[] = [];
  values.forEach((v, i) => {
    const p = points[i];
    if (p && Math.abs(v - mean) > std) {
      result.push(p);
    }
  });
  return result;
};

type SvgBodyProps = {
  points: Point[];
  outliers: Point[];
  tone: PulseLineTone;
  height: number;
  showArea: boolean;
  showPoint: boolean;
};

const SvgBody = ({ points, outliers, tone, height, showArea, showPoint }: SvgBodyProps): ReactNode => {
  const t = TONE[tone];
  const PathEl = 'path' as unknown as React.ElementType;
  const CircleEl = 'circle' as unknown as React.ElementType;
  const DefsEl = 'defs' as unknown as React.ElementType;
  const GradEl = 'linearGradient' as unknown as React.ElementType;
  const StopEl = 'stop' as unknown as React.ElementType;
  const strokeId = `aurora-pulse-stroke-${tone}`;
  const areaId = `aurora-pulse-area-${tone}`;
  const path = catmullRomPath(points);
  const usableW = CANVAS_W - PAD_X * 2;
  const areaPath = showArea ? `${path} L ${PAD_X + usableW},${height} L ${PAD_X},${height} Z` : '';
  const last = points[points.length - 1];
  return (
    <>
      <DefsEl>
        <GradEl id={strokeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <StopEl offset="0%" stopColor={t.deep} stopOpacity={0.4} />
          <StopEl offset="40%" stopColor={t.stroke} stopOpacity={1} />
          <StopEl offset="100%" stopColor={t.stroke} stopOpacity={1} />
        </GradEl>
        <GradEl id={areaId} x1="0%" y1="0%" x2="0%" y2="100%">
          <StopEl offset="0%" stopColor={t.stroke} stopOpacity={0.28} />
          <StopEl offset="100%" stopColor={t.stroke} stopOpacity={0} />
        </GradEl>
      </DefsEl>
      {showArea ? <PathEl d={areaPath} fill={`url(#${areaId})`} /> : null}
      <PathEl
        d={path}
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {outliers.map((p, i) => (
        <CircleEl key={`outlier-${i}`} cx={p.x} cy={p.y} r={3} fill={theme.tokens.intent.notice} opacity={0.9} />
      ))}
      {showPoint && last ? (
        <>
          <CircleEl cx={last.x} cy={last.y} r={6} fill={t.stroke} opacity={0.18} />
          <CircleEl cx={last.x} cy={last.y} r={3.5} fill={t.stroke} />
          <CircleEl cx={last.x} cy={last.y} r={1.5} fill={theme.tokens.surface.base} />
        </>
      ) : null}
    </>
  );
};

const PulseLine = ({
  values,
  width,
  height = 80,
  tone = 'recover',
  showPoint = true,
  showArea = false,
  showOutliers = false,
}: PulseLineProps): ReactNode => {
  const responsive = width === undefined;
  const renderedWidth = width ?? CANVAS_W;
  const containerStyle = {
    width: responsive ? ('100%' as const) : renderedWidth,
    height,
    alignSelf: responsive ? ('stretch' as const) : undefined,
  };
  if (values.length < 2 || Platform.OS !== 'web') {
    return <View style={containerStyle} />;
  }
  const points = computePoints(values, height);
  const outliers = showOutliers ? pickOutliers(values, points) : [];
  const SvgEl = 'svg' as unknown as React.ElementType;
  return (
    <View style={containerStyle}>
      <SvgEl
        width={responsive ? '100%' : renderedWidth}
        height={height}
        viewBox={`0 0 ${CANVAS_W} ${height}`}
        preserveAspectRatio="none"
      >
        <SvgBody
          points={points}
          outliers={outliers}
          tone={tone}
          height={height}
          showArea={showArea}
          showPoint={showPoint}
        />
      </SvgEl>
    </View>
  );
};

export type { PulseLineProps, PulseLineTone };
export { PulseLine };
