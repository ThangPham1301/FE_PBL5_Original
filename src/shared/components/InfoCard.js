import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useAppTheme from '../theme/useAppTheme';
import AnimatedCard from './AnimatedCard';

export default function InfoCard({
  title,
  subtitle,
  right,
  animationIndex = 0,
  playAnimation = true,
  onAnimationDone,
}) {
  const { colors, radius } = useAppTheme();
  const safeIndex = Number.isFinite(animationIndex) ? Math.max(0, animationIndex) : 0;
  const staggerDelay = Math.min(safeIndex, 12) * 26;

  return (
    <AnimatedCard
      delay={staggerDelay}
      duration={260}
      fromY={8}
      play={playAnimation}
      onDidAnimate={onAnimationDone}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.md,
        },
      ]}
    >
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
