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
      <View style={styles.online} accessibilityRole="text">
        <Wifi color={colors.success} size={16} strokeWidth={2.2} />
        <Text style={styles.onlineText}>Online</Text>
      </View>
    );
  }

  return (
    <View style={styles.offline} accessibilityRole="alert">
      <WifiOff color={colors.text} size={16} strokeWidth={2.2} />
      <Text style={styles.offlineText}>Offline. Messages stay in the queue.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  online: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offline: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.offline,
  },
  onlineText: {
    color: colors.success,
    fontSize: typography.label,
    fontWeight: '700',
  },
  offlineText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
  },
});
