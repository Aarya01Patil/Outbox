import {AlertCircle, CheckCircle2, Loader2} from 'lucide-react-native';
import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text, View} from 'react-native';

import type {SyncStatusSnapshot} from '../../sync/syncStatusStore';
import {colors, radius, spacing, typography} from '../theme';

export interface SyncIndicatorProps {
  status: SyncStatusSnapshot;
}

export function SyncIndicator({status}: SyncIndicatorProps): React.JSX.Element {
  const label = getSyncLabel(status);
  const accessibilityLabel = getSyncAccessibilityLabel(status, label);
  const tone = getTone(status);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={[styles.container, getContainerStyle(tone)]}
    >
      <SyncIcon tone={tone} spinning={status.phase === 'running'} />
      <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.text, styles[tone]]}>
        {label}
      </Text>
    </View>
  );
}

function SyncIcon({
  tone,
  spinning,
}: {
  tone: 'muted' | 'success' | 'warning' | 'danger';
  spinning: boolean;
}): React.JSX.Element {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (spinning) {
      const rotation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );

      rotation.start();

      return () => {
        rotation.stop();
        rotateAnim.setValue(0);
      };
    }

    rotateAnim.setValue(0);
    return undefined;
  }, [spinning, rotateAnim]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 14,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [tone, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (tone === 'success') {
    return (
      <Animated.View style={{transform: [{scale: scaleAnim}]}}>
        <CheckCircle2 color={colors.success} size={14} strokeWidth={2.2} />
      </Animated.View>
    );
  }

  if (tone === 'danger') {
    return (
      <Animated.View style={{transform: [{scale: scaleAnim}]}}>
        <AlertCircle color={colors.danger} size={14} strokeWidth={2.2} />
      </Animated.View>
    );
  }

  const iconColor = tone === 'warning' ? colors.warning : colors.textSubtle;

  return (
    <Animated.View
      style={spinning ? {transform: [{rotate: spin}]} : undefined}
    >
      <Loader2 color={iconColor} size={14} strokeWidth={2.2} />
    </Animated.View>
  );
}

function getSyncLabel(status: SyncStatusSnapshot): string {
  if (status.phase === 'running') {
    return 'Syncing…';
  }

  if (status.phase === 'failed') {
    return 'Sync failed';
  }

  if (status.phase === 'timed-out') {
    return 'Sync timed out';
  }

  const summary = status.lastSummary;

  if (summary !== null && summary.conflicted > 0) {
    return `${summary.conflicted} conflict${summary.conflicted === 1 ? '' : 's'}`;
  }

  if (status.phase === 'succeeded') {
    return 'Queue synced';
  }

  return 'Sync idle';
}

function getSyncAccessibilityLabel(
  status: SyncStatusSnapshot,
  visibleLabel: string,
): string {
  if (status.phase === 'failed' && status.lastErrorMessage !== null) {
    return `${visibleLabel}: ${status.lastErrorMessage}`;
  }

  return visibleLabel;
}

function getTone(
  status: SyncStatusSnapshot,
): 'muted' | 'success' | 'warning' | 'danger' {
  if (status.phase === 'failed' || status.phase === 'timed-out') {
    return 'danger';
  }

  if (status.phase === 'running') {
    return 'warning';
  }

  if (status.lastSummary !== null && status.lastSummary.conflicted > 0) {
    return 'warning';
  }

  if (status.phase === 'succeeded') {
    return 'success';
  }

  return 'muted';
}

function getContainerStyle(tone: 'muted' | 'success' | 'warning' | 'danger') {
  switch (tone) {
    case 'success':
      return styles.successContainer;
    case 'warning':
      return styles.warningContainer;
    case 'danger':
      return styles.dangerContainer;
    case 'muted':
      return styles.mutedContainer;
  }
}

const styles = StyleSheet.create({
  container: {
    minHeight: 30,
    maxWidth: 176,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  text: {
    flexShrink: 1,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  mutedContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  successContainer: {
    backgroundColor: colors.successGlow,
    borderColor: 'rgba(53, 211, 154, 0.3)',
  },
  warningContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  dangerContainer: {
    backgroundColor: colors.dangerGlow,
    borderColor: 'rgba(255, 124, 119, 0.3)',
  },
  muted: {
    color: colors.textSubtle,
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
});
