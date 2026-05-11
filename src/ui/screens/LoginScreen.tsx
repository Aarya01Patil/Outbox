import {Database, LogIn, RefreshCw, Shield} from 'lucide-react-native';
import React, {useEffect, useRef, useState} from 'react';
import {
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video from 'react-native-video';
import {SafeAreaView} from 'react-native-safe-area-context';

import {colors, radius, spacing, touchTarget, typography} from '../theme';

const loginVideo = require('../../assets/outbox-login.mp4') as number;
const loginPoster = require('../../assets/outbox-login-poster.png') as number;
const loginVideoSource = {
  uri: Image.resolveAssetSource(loginVideo).uri,
};

export interface LoginScreenProps {
  onEnter: () => void;
}

export function LoginScreen({onEnter}: LoginScreenProps): React.JSX.Element {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [videoReady, setVideoReady] = useState(false);

  // Staggered entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(buttonScale, {
          toValue: 1,
          damping: 12,
          stiffness: 180,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous gentle pulse on the CTA
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [headerFade, headerSlide, contentFade, contentSlide, buttonScale, buttonFade, pulseAnim]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Video hero */}
          <View style={styles.mediaFrame}>
            <Video
              source={loginVideoSource}
              repeat
              muted
              resizeMode="cover"
              paused={appState !== 'active'}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="ignore"
              bufferConfig={videoBufferConfig}
              onReadyForDisplay={() => setVideoReady(true)}
              style={styles.video}
              testID="login-video"
            />
            {!videoReady ? (
              <Image source={loginPoster} resizeMode="cover" style={styles.poster} />
            ) : null}
            {/* Gradient overlay */}
            <View style={styles.mediaOverlayTop} />
            <View style={styles.mediaOverlayBottom} />
            <MotionPreview />
            <View style={styles.mediaHeader}>
              <View style={styles.wordmarkPill}>
                <Text style={styles.wordmark}>Outbox</Text>
              </View>
            </View>
          </View>

          {/* Content panel */}
          <Animated.View
            style={[
              styles.panel,
              {
                opacity: headerFade,
                transform: [{translateY: headerSlide}],
              },
            ]}
          >
            <Text accessibilityRole="header" style={styles.title}>
              Offline-first{'\n'}messaging
            </Text>
            <Text style={styles.body}>
              Send immediately. Sync safely. Resolve conflicts without losing
              your local work.
            </Text>
          </Animated.View>

          {/* Feature cards */}
          <Animated.View
            style={[
              styles.featureList,
              {
                opacity: contentFade,
                transform: [{translateY: contentSlide}],
              },
            ]}
          >
            <FeatureCard
              icon={<Database color={colors.primary} size={18} strokeWidth={2.2} />}
              title="Durable local outbox"
              detail="Messages persist instantly before the network is involved."
              accentColor={colors.primaryGlow}
              index={0}
            />
            <FeatureCard
              icon={<RefreshCw color={colors.success} size={18} strokeWidth={2.2} />}
              title="Background recovery"
              detail="Queued work resumes when the OS gives the app time."
              accentColor={colors.successGlow}
              index={1}
            />
            <FeatureCard
              icon={<Shield color={colors.conflict} size={18} strokeWidth={2.2} />}
              title="Conflict-aware sync"
              detail="Server-authoritative updates still preserve your local intent."
              accentColor={colors.conflictGlow}
              index={2}
            />
          </Animated.View>

          {/* CTA */}
          <Animated.View
            style={[
              styles.ctaContainer,
              {
                opacity: buttonFade,
                transform: [{scale: Animated.multiply(buttonScale, pulseAnim)}],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter chat"
              onPress={onEnter}
              style={({pressed}) => [
                styles.enterButton,
                pressed && styles.enterPressed,
              ]}
            >
              <LogIn color={colors.background} size={20} strokeWidth={2.4} />
              <Text style={styles.enterText}>Enter chat</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MotionPreview(): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2_800,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [progress]);

  const packetTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-90, 120],
  });
  const packetOpacity = progress.interpolate({
    inputRange: [0, 0.18, 0.82, 1],
    outputRange: [0, 1, 1, 0],
  });
  const pulseScale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.96, 1.04, 0.96],
  });

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.motionLayer}
    >
      <View style={styles.motionThread}>
        <Animated.View
          style={[
            styles.motionBubble,
            styles.motionBubbleIncoming,
            {transform: [{scale: pulseScale}]},
          ]}
        />
        <Animated.View
          style={[
            styles.motionBubble,
            styles.motionBubbleOutgoing,
            {transform: [{scale: pulseScale}]},
          ]}
        />
        <Animated.View
          style={[
            styles.motionBubble,
            styles.motionBubblePending,
            {transform: [{scale: pulseScale}]},
          ]}
        />
      </View>
      <View style={styles.motionRail}>
        <Animated.View
          style={[
            styles.motionPacket,
            {
              opacity: packetOpacity,
              transform: [{translateX: packetTranslateX}],
            },
          ]}
        />
      </View>
    </View>
  );
}

interface FeatureCardProps {
  icon: React.JSX.Element;
  title: string;
  detail: string;
  accentColor: string;
  index: number;
}

function FeatureCard({icon, title, detail, accentColor, index}: FeatureCardProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: 400 + index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: 400 + index * 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        styles.featureCard,
        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
      ]}
    >
      <View style={[styles.featureIcon, {backgroundColor: accentColor}]}>
        {icon}
      </View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </Animated.View>
  );
}

const videoBufferConfig = {
  minBufferMs: 1_500,
  maxBufferMs: 5_000,
  bufferForPlaybackMs: 500,
  bufferForPlaybackAfterRebufferMs: 1_000,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  mediaFrame: {
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  video: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  poster: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mediaOverlayTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Simulated top gradient via opacity
    opacity: 0.6,
  },
  mediaOverlayBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: 120,
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  motionLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  motionThread: {
    gap: spacing.sm,
  },
  motionBubble: {
    height: 38,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  motionBubbleIncoming: {
    alignSelf: 'flex-start',
    width: '58%',
    backgroundColor: 'rgba(243, 247, 252, 0.1)',
    borderColor: 'rgba(243, 247, 252, 0.2)',
  },
  motionBubbleOutgoing: {
    alignSelf: 'flex-end',
    width: '70%',
    backgroundColor: 'rgba(49, 181, 255, 0.25)',
    borderColor: 'rgba(49, 181, 255, 0.45)',
  },
  motionBubblePending: {
    alignSelf: 'flex-end',
    width: '48%',
    backgroundColor: 'rgba(53, 211, 154, 0.15)',
    borderColor: 'rgba(53, 211, 154, 0.35)',
  },
  motionRail: {
    height: 2,
    marginTop: spacing.xl,
    overflow: 'hidden',
    borderRadius: 1,
    backgroundColor: 'rgba(134, 160, 188, 0.2)',
  },
  motionPacket: {
    width: 76,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  mediaHeader: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-start',
  },
  wordmarkPill: {
    alignSelf: 'flex-start',
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.glassBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  panel: {
    paddingHorizontal: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: spacing.md,
    maxWidth: 340,
  },
  featureList: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  featureDetail: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  ctaContainer: {
    paddingHorizontal: spacing.xs,
  },
  enterButton: {
    minHeight: touchTarget.minHeight + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  enterPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{scale: 0.97}],
  },
  enterText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
