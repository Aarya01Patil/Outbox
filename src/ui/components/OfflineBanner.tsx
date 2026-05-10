import {Wifi, WifiOff} from 'lucide-react-native';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors, spacing, typography} from '../theme';

export interface OfflineBannerProps {
  isConnected: boolean;
}

export function OfflineBanner({isConnected}: OfflineBannerProps): React.JSX.Element {
  if (isConnected) {
    return (
      <View style={[styles.pill, styles.online]} accessibilityRole="text">
        <Wifi color={colors.success} size={16} strokeWidth={2.2} />
        <Text style={styles.onlineText}>Online</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, styles.offline]} accessibilityRole="alert">
      <WifiOff color={colors.text} size={16} strokeWidth={2.2} />
      <Text style={styles.offlineText}>Offline queue active</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  online: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  offline: {
    backgroundColor: colors.offline,
    borderColor: colors.offline,
  },
  onlineText: {
    color: colors.success,
    fontSize: typography.label,
    fontWeight: '800',
  },
  offlineText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
  },
});
