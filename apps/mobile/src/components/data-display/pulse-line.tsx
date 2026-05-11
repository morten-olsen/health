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

const CANVAS_W = 360;

const TONE: Record<PulseLineTone, { stroke: string; fill: string; deep: string }> = {
  recover: {
    stroke: theme.tokens.intent.recover,
    deep: theme.tokens.intent.recoverDeep,
    fill: 'rgba(127, 231, 181, 0.18)',
  },
  rest: {
    stroke: theme.tokens.intent.rest,
    deep: theme.tokens.intent.restDeep,
    fill: 'rgba(123, 185, 255, 0.16)',
  },
  strain: {
    stroke: theme.tokens.intent.strain,
    deep: theme.tokens.intent.strainDeep,
    fill: 'rgba(168, 139, 255, 0.18)',
  },
  notice: {
    stroke: theme.tokens.intent.notice,
    deep: theme.tokens.intent.noticeDeep,
    fill: 'rgba(255, 179, 107, 0.16)',
  },
  alert: {
    stroke: theme.tokens.intent.alert,
    deep: theme.tokens.intent.alertDeep,
    fill: 'rgba(255, 123, 123, 0.16)',
  },
};

const catmullRomPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0]!;
    return `M${p.x},${p.y}`;
  }
  const d: string[] = [`M${points[0]!.x},${points[0]!.y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }
  return d.join(' ');
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
  const t = TONE[tone];
  // The SVG always draws on a logical canvas (CANVAS_W × height). When `width`
  // is omitted, the rendered SVG fills its parent — viewBox handles scaling.
  const responsive = width === undefined;
  const renderedWidth = width ?? CANVAS_W;
  const logicalW = CANVAS_W;
  if (values.length < 2) {
    return <View style={{ width: responsive ? '100%' : renderedWidth, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padY = 6;
  // Horizontal padding to keep the witness point's halo from clipping at the
  // viewBox edge. Matches the point radius (with halo) below.
  const padX = 8;
  const usableW = logicalW - padX * 2;
  const usableH = height - padY * 2;
  const points = values.map((v, i) => ({
    x: padX + (i / (values.length - 1)) * usableW,
    y: padY + (1 - (v - min) / range) * usableH,
  }));
  const path = catmullRomPath(points);
  const areaPath = showArea
    ? `${path} L ${padX + usableW},${height} L ${padX},${height} Z`
    : '';
  const last = points[points.length - 1]!;

  let outliers: { x: number; y: number }[] = [];
  if (showOutliers) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
    const std = Math.sqrt(variance);
    outliers = points.filter((_, i) => {
      const v = values[i]!;
      return Math.abs(v - mean) > std;
    });
  }

  if (Platform.OS === 'web') {
    const SvgEl = 'svg' as unknown as React.ElementType;
    const DefsEl = 'defs' as unknown as React.ElementType;
    const GradEl = 'linearGradient' as unknown as React.ElementType;
    const StopEl = 'stop' as unknown as React.ElementType;
    const PathEl = 'path' as unknown as React.ElementType;
    const CircleEl = 'circle' as unknown as React.ElementType;
    const StrokeGradId = `aurora-pulse-stroke-${tone}`;
    const AreaGradId = `aurora-pulse-area-${tone}`;
    return (
      <View
        style={{
          width: responsive ? '100%' : renderedWidth,
          height,
          alignSelf: responsive ? 'stretch' : undefined,
        }}
      >
        <SvgEl
          width={responsive ? '100%' : renderedWidth}
          height={height}
          viewBox={`0 0 ${logicalW} ${height}`}
          preserveAspectRatio="none"
        >
          <DefsEl>
            <GradEl id={StrokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <StopEl offset="0%" stopColor={t.deep} stopOpacity={0.4} />
              <StopEl offset="40%" stopColor={t.stroke} stopOpacity={1} />
              <StopEl offset="100%" stopColor={t.stroke} stopOpacity={1} />
            </GradEl>
            <GradEl id={AreaGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <StopEl offset="0%" stopColor={t.stroke} stopOpacity={0.28} />
              <StopEl offset="100%" stopColor={t.stroke} stopOpacity={0} />
            </GradEl>
          </DefsEl>
          {showArea ? <PathEl d={areaPath} fill={`url(#${AreaGradId})`} /> : null}
          <PathEl
            d={path}
            fill="none"
            stroke={`url(#${StrokeGradId})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {outliers.map((p, i) => (
            <CircleEl
              key={`outlier-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={theme.tokens.intent.notice}
              opacity={0.9}
            />
          ))}
          {showPoint ? (
            <>
              <CircleEl
                cx={last.x}
                cy={last.y}
                r={6}
                fill={t.stroke}
                opacity={0.18}
              />
              <CircleEl cx={last.x} cy={last.y} r={3.5} fill={t.stroke} />
              <CircleEl
                cx={last.x}
                cy={last.y}
                r={1.5}
                fill={theme.tokens.surface.base}
              />
            </>
          ) : null}
        </SvgEl>
      </View>
    );
  }
  return (
    <View
      style={{
        width: responsive ? '100%' : renderedWidth,
        height,
        backgroundColor: theme.tokens.surface.raised,
      }}
    />
  );
};

export type { PulseLineProps, PulseLineTone };
export { PulseLine };
