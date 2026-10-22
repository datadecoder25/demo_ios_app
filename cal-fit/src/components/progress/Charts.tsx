import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, fonts } from '@/constants/design';

/** Simple line chart with gridlines, y labels and x labels (Progress → Weight). */
export function LineChart({
  values,
  labels,
  height = 150,
}: {
  values: number[];
  labels: string[];
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  const yLabelWidth = 28;
  const chartWidth = Math.max(0, width - yLabelWidth);
  const padY = 8;
  const x = (i: number) => yLabelWidth + (values.length === 1 ? chartWidth / 2 : (i / (values.length - 1)) * (chartWidth - 8) + 4);
  const y = (v: number) => padY + (1 - (v - min) / (max - min || 1)) * (height - padY * 2);

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const area = `${path} L ${x(values.length - 1)} ${height} L ${x(0)} ${height} Z`;
  const ticks = [max, (max + min) / 2, min];

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.18} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map(t => (
            <Line key={t} x1={yLabelWidth} x2={width} y1={y(t)} y2={y(t)} stroke={colors.track} strokeWidth={1} />
          ))}
          <Path d={area} fill="url(#weight-area)" />
          <Path d={path} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
          {values.map((v, i) => (
            <Circle key={i} cx={x(i)} cy={y(v)} r={3.5} fill={colors.surface} stroke={colors.primary} strokeWidth={2} />
          ))}
        </Svg>
      )}
      {width > 0 &&
        ticks.map(t => (
          <Text key={t} style={[styles.yLabel, { top: y(t) - 7 }]}>
            {Math.round(t)}
          </Text>
        ))}
      <View style={[styles.xLabels, { paddingLeft: yLabelWidth }]}>
        {labels.map((label, i) => (
          <Text key={`${label}-${i}`} style={styles.axisText}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Seven vertical bars vs a target (Progress → Calorie Consistency). */
export function BarChart({
  values,
  labels,
  target,
  height = 90,
}: {
  values: number[];
  labels: string[];
  target: number;
  height?: number;
}) {
  const max = Math.max(target * 1.2, ...values, 1);
  return (
    <View>
      <View style={[styles.bars, { height }]}>
        <View style={[styles.targetLine, { bottom: (target / max) * height }]} />
        {values.map((v, i) => {
          const hit = v >= target * 0.9;
          return (
            <View key={i} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (v / max) * height),
                    backgroundColor: v === 0 ? colors.track : hit ? colors.primary : '#9CC0FF',
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.barLabels}>
        {labels.map((label, i) => (
          <Text key={`${label}-${i}`} style={[styles.axisText, styles.barLabel]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export type StreakDay = { label: string; state: 'done' | 'missed' | 'today' };

/** Row of day dots: green = meal logged, ring = nothing logged, navy ring = today (not logged yet). */
export function StreakDots({ days }: { days: StreakDay[] }) {
  return (
    <View style={styles.dots}>
      {days.map((d, i) => (
        <View key={i} style={styles.dotCol}>
          <View
            style={[
              styles.dot,
              d.state === 'done' && { backgroundColor: colors.success },
              d.state === 'missed' && styles.dotMissed,
              d.state === 'today' && styles.dotToday,
            ]}
          />
          <Text style={styles.dotLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: {
    position: 'absolute',
    left: 0,
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textMuted,
    opacity: 0.6,
  },
  barSlot: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    maxWidth: 22,
    borderRadius: 6,
  },
  barLabels: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  barLabel: {
    flex: 1,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dotCol: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotMissed: {
    borderWidth: 1.5,
    borderColor: '#C9D3E6',
  },
  dotToday: {
    borderWidth: 2,
    borderColor: colors.navy,
  },
  dotLabel: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.textMuted,
  },
});
