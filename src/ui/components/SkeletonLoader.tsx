import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';

import {colors, radius, spacing} from '../theme';

export type SkeletonVariant = 'chat' | 'conversations';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
}

export function SkeletonLoader({
  variant = 'chat',
}: SkeletonLoaderProps): React.JSX.Element {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [shimmer]);

  const pulseOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });

  if (variant === 'conversations') {
    return (
      <View style={styles.container} accessibilityLabel="Loading conversations">
        {[0, 1, 2, 3].map(index => (
          <Animated.View
            key={index}
            style={[
              styles.conversationCard,
              {opacity: pulseOpacity},
              {transform: [{scale: shimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.005],
              })}]},
            ]}
          >
            <View style={styles.convAvatar} />
            <View style={styles.convContent}>
              <View style={[styles.bar, {width: `${55 + index * 8}%`}]} />
              <View style={[styles.barSmall, {width: `${70 + index * 5}%`}]} />
            </View>
            <View style={styles.convBadge} />
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="Loading messages">
      {[
        {align: 'flex-start' as const, width: '76%' as const, height: 72},
        {align: 'flex-end' as const, width: '68%' as const, height: 64},
        {align: 'flex-start' as const, width: '52%' as const, height: 52},
        {align: 'flex-end' as const, width: '60%' as const, height: 58},
        {align: 'flex-start' as const, width: '44%' as const, height: 48},
      ].map((item, index) => (
        <Animated.View
          key={index}
          style={[
            styles.chatBubble,
            {
              alignSelf: item.align,
              width: item.width,
              height: item.height,
              opacity: pulseOpacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  chatBubble: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
  },
  conversationCard: {
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
  },
  convContent: {
    flex: 1,
    gap: spacing.sm,
  },
  bar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  barSmall: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted,
    opacity: 0.6,
  },
  convBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
});
