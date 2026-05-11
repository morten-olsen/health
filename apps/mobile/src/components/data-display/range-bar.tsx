import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../primitives/text.tsx';
import { theme } from '../../shared/theme/theme.ts';
import type { Intent } from '../../shared/theme/theme.ts';

type RangeZone = {
  /** 0..1 fraction of the total span this zone occupies. */
  size: number;
  tone: Extract<Intent, 'rest' | 'recover' | 'strain' | 'notice' | 'alert'>;
  label?: string;
};

type RangeBarProps = {
  zones: RangeZone[];
  /** Position of the marker (0..1). */
  marker?: number;
  markerLabel?: string;
  height?: number;
  showLabels?: boolean;
};

const TONE_FROM: Record<RangeZone['tone'], string> = {
  rest: 'rgba(123, 185, 255, 0.32)',
  recover: 'rgba(127, 231, 181, 0.32)',
  strain: 'rgba(168, 139, 255, 0.32)',
  notice: 'rgba(255, 179, 107, 0.32)',
  alert: 'rgba(255, 123, 123, 0.32)',
};

const TONE_TO: Record<RangeZone['tone'], string> = {
  rest: theme.tokens.intent.rest,
  recover: theme.tokens.intent.recover,
  strain: theme.tokens.intent.strain,
  notice: theme.tokens.intent.notice,
  alert: theme.tokens.intent.alert,
};

type ZonesTrackProps = {
  zones: RangeZone[];
  height: number;
  marker?: number;
};

const ZonesTrack = ({ zones, height, marker }: ZonesTrackProps): ReactNode => (
  <View
    style={{
      position: 'relative',
      flexDirection: 'row',
      height,
      borderRadius: 999,
      overflow: 'hidden',
    }}
  >
    {zones.map((z, i) => (
      <View
        key={`${z.tone}-${i}`}
        style={{
          flex: z.size,
          backgroundColor: TONE_FROM[z.tone],
          borderRightWidth: i === zones.length - 1 ? 0 : 1,
          borderRightColor: theme.tokens.surface.base,
        }}
      />
    ))}
    {marker !== undefined ? (
      <View
        style={{
          position: 'absolute',
          top: -3,
          bottom: -3,
          width: 3,
          borderRadius: 2,
          backgroundColor: theme.tokens.ink.primary,
          left: `${Math.max(0, Math.min(1, marker)) * 100}%`,
          transform: [{ translateX: -1.5 }],
        }}
      />
    ) : null}
  </View>
);

const ZoneLabels = ({ zones }: { zones: RangeZone[] }): ReactNode => (
  <View style={{ flexDirection: 'row' }}>
    {zones.map((z, i) => (
      <View key={`label-${i}`} style={{ flex: z.size, alignItems: 'flex-start' }}>
        <Text role="micro" style={{ color: TONE_TO[z.tone] }} uppercase>
          {z.label ?? z.tone}
        </Text>
      </View>
    ))}
  </View>
);

const MarkerLabel = ({ marker, label }: { marker: number; label: string }): ReactNode => (
  <View style={{ position: 'relative', height: 16 }}>
    <View
      style={{
        position: 'absolute',
        left: `${marker * 100}%`,
        transform: [{ translateX: -50 }],
        width: 100,
        alignItems: 'center',
      }}
    >
      <Text role="micro" tone="secondary">
        {label}
      </Text>
    </View>
  </View>
);

const RangeBar = ({ zones, marker, markerLabel, height = 10, showLabels = false }: RangeBarProps): ReactNode => {
  return (
    <View style={{ gap: 8 }}>
      <ZonesTrack zones={zones} height={height} marker={marker} />
      {showLabels ? <ZoneLabels zones={zones} /> : null}
      {markerLabel ? <MarkerLabel marker={marker ?? 0} label={markerLabel} /> : null}
    </View>
  );
};

export type { RangeBarProps, RangeZone };
export { RangeBar };
