import React from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, spacing} from '../theme';

export function SkeletonLoader(): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityLabel="Loading messages">
      <View style={styles.leftBubble} />
      <View style={styles.rightBubble} />
      <View style={styles.leftBubbleSmall} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  leftBubble: {
    width: '76%',
    height: 72,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  rightBubble: {
    width: '68%',
    height: 64,
    alignSelf: 'flex-end',
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  leftBubbleSmall: {
    width: '52%',
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
});
