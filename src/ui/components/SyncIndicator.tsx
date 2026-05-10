import {AlertCircle, CheckCircle2, Loader2} from 'lucide-react-native';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {SyncStatusSnapshot} from '../../sync/syncStatusStore';
import {colors, spacing, typography} from '../theme';

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
      <SyncIcon tone={tone} />
      <Text ellipsizeMode="tail" numberOfLines={1} style={[styles.text, styles[tone]]}>
        {label}
      </Text>
    </View>
  );
}

function SyncIcon({tone}: {tone: 'muted' | 'success' | 'warning' | 'danger'}): React.JSX.Element {
  if (tone === 'success') {
    return <CheckCircle2 color={colors.success} size={16} strokeWidth={2.2} />;
  }

  if (tone === 'danger') {
    return <AlertCircle color={colors.danger} size={16} strokeWidth={2.2} />;
  }

  return <Loader2 color={tone === 'warning' ? colors.warning : colors.textSubtle} size={16} strokeWidth={2.2} />;
}

function getSyncLabel(status: SyncStatusSnapshot): string {
  if (status.phase === 'running') {
    return 'Syncing queue';
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
    minHeight: 32,
    maxWidth: 176,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  text: {
    flexShrink: 1,
    fontSize: typography.label,
    fontWeight: '700',
  },
  mutedContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  successContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  warningContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  dangerContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
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
