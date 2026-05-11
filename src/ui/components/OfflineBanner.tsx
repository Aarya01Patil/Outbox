import {Wifi, WifiOff} from 'lucide-react-native';
import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, Text} from 'react-native';

import {animation, colors, radius, spacing, typography} from '../theme';

export interface OfflineBannerProps {
  isConnected: boolean;
  compact?: boolean;
}

export function OfflineBanner({isConnected, compact = false}: OfflineBannerProps): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset to 0 before each transition so the spring plays visibly on every state change.
    slideAnim.setValue(0);
    Animated.spring(slideAnim, {
      toValue: 1,
      damping: animation.spring.damping,
      stiffness: animation.spring.stiffness,
      useNativeDriver: true,
    }).start();
  }, [isConnected, slideAnim]);

  useEffect(() => {
    if (!isConnected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );

      pulse.start();

      return () => {
        pulse.stop();
      };
    } else {
      pulseAnim.setValue(1);
    }

    return undefined;
  }, [isConnected, pulseAnim]);

  const scaleTransform = {
    transform: [{scale: slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    })}],
  };

  if (isConnected) {
    return (
      <Animated.View
        style={[
          styles.pill,
          styles.online,
          compact && styles.pillCompact,
          scaleTransform,
        ]}
        accessibilityRole="text"
      >
        <Wifi color={colors.success} size={14} strokeWidth={2.2} />
        {!compact && <Text style={styles.onlineText}>Online</Text>}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.pill,
        styles.offline,
        compact && styles.pillCompact,
        {opacity: pulseAnim},
        scaleTransform,
      ]}
      accessibilityRole="alert"
    >
      <WifiOff color={colors.text} size={14} strokeWidth={2.2} />
      <Text style={styles.offlineText}>
        {compact ? 'Offline' : 'Offline — queuing locally'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillCompact: {
    paddingHorizontal: spacing.sm,
  },
  online: {
    backgroundColor: colors.successGlow,
    borderColor: 'rgba(53, 211, 154, 0.3)',
  },
  offline: {
    backgroundColor: colors.offline,
    borderColor: colors.offline,
  },
  onlineText: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  offlineText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '800',
  },
});
