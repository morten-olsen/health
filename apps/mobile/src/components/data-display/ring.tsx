import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '../primitives/text.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type RingTone = Extract<Intent, 'recover' | 'rest' | 'strain' | 'notice' | 'alert'>;

type RingProps = {
  /** 0..1 */
  progress: number;
  size?: number;
  thickness?: number;
  tone?: RingTone;
  label?: string;
  value?: string;
  unit?: string;
};

const TONE: Record<RingTone, { from: string; to: string }> = {
  recover: { from: theme.tokens.intent.recover, to: theme.tokens.intent.recoverDeep },
  rest: { from: theme.tokens.intent.rest, to: theme.tokens.intent.restDeep },
  strain: { from: theme.tokens.intent.strain, to: theme.tokens.intent.strainDeep },
  notice: { from: theme.tokens.intent.notice, to: theme.tokens.intent.noticeDeep },
  alert: { from: theme.tokens.intent.alert, to: theme.tokens.intent.alertDeep },
};

const Ring = ({
  progress,
  size = 200,
  thickness = 16,
  tone = 'recover',
  label,
  value,
  unit,
}: RingProps): ReactNode => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const colors = TONE[tone];

  if (Platform.OS === 'web') {
    const SvgEl = 'svg' as unknown as React.ElementType;
    const CircleEl = 'circle' as unknown as React.ElementType;
    const DefsEl = 'defs' as unknown as React.ElementType;
    const GradEl = 'linearGradient' as unknown as React.ElementType;
    const StopEl = 'stop' as unknown as React.ElementType;
    const FilterEl = 'filter' as unknown as React.ElementType;
    const FeGaussian = 'feGaussianBlur' as unknown as React.ElementType;
    const FeMerge = 'feMerge' as unknown as React.ElementType;
    const FeMergeNode = 'feMergeNode' as unknown as React.ElementType;
    const gradId = `aurora-ring-${tone}`;
    const glowId = `aurora-glow-${tone}`;
    return (
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgEl
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
        >
          <DefsEl>
            <GradEl id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <StopEl offset="0%" stopColor={colors.from} />
              <StopEl offset="100%" stopColor={colors.to} />
            </GradEl>
            <FilterEl id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <FeGaussian stdDeviation="3" result="blur" />
              <FeMerge>
                <FeMergeNode in="blur" />
                <FeMergeNode in="SourceGraphic" />
              </FeMerge>
            </FilterEl>
          </DefsEl>
          {/* Track — a faint, even ring. */}
          <CircleEl
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.tokens.surface.edge}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
          />
          {/* Progress — the only colored stroke. */}
          <CircleEl
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${gradId})`}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            filter={`url(#${glowId})`}
            style={
              {
                transition: `stroke-dashoffset ${theme.motion.duration.arrival}ms ${theme.motion.easing.arrive}`,
              } as unknown as React.CSSProperties
            }
          />
        </SvgEl>
        {(value || label) && (
          <View style={{ alignItems: 'center', gap: 2 }}>
            {label ? (
              <Text role="eyebrow" tone="tertiary" uppercase>
                {label}
              </Text>
            ) : null}
            {value ? (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text role="bigNumeral">{value}</Text>
                {unit ? (
                  <Text role="caption" tone="tertiary">
                    {unit}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  }
  // Native fallback — a simple stacked disc; ring SVG arrives with react-native-svg.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: colors.from,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {value ? <Text role="bigNumeral">{value}</Text> : null}
    </View>
  );
};

export type { RingProps, RingTone };
export { Ring };
