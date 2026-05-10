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

import {colors, spacing, touchTarget, typography} from '../theme';

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
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
            <View style={styles.mediaOverlay} />
            <MotionPreview />
            <View style={styles.mediaHeader}>
              <View style={styles.wordmarkPill}>
                <Text style={styles.wordmark}>Outbox</Text>
              </View>
            </View>
          </View>

          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.title}>
              Offline-first messaging
            </Text>
            <Text style={styles.body}>
              Send immediately, sync safely, and resolve conflicts without losing
              local work.
            </Text>

            <View style={styles.featureList}>
              <FeatureRow
                icon={<Database color={colors.primary} size={18} strokeWidth={2.2} />}
                title="Durable local outbox"
                detail="Messages persist before the network is involved."
              />
              <FeatureRow
                icon={<RefreshCw color={colors.primary} size={18} strokeWidth={2.2} />}
                title="Background recovery"
                detail="Queued work resumes when the OS gives the app time."
              />
              <FeatureRow
                icon={<Shield color={colors.primary} size={18} strokeWidth={2.2} />}
                title="Conflict-aware sync"
                detail="Server-authoritative updates still preserve local intent."
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter chat"
              onPress={onEnter}
              style={styles.enterButton}
            >
              <LogIn color={colors.background} size={20} strokeWidth={2.4} />
              <Text style={styles.enterText}>Enter chat</Text>
            </Pressable>
          </View>
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

interface FeatureRowProps {
  icon: React.JSX.Element;
  title: string;
  detail: string;
}

function FeatureRow({icon, title, detail}: FeatureRowProps): React.JSX.Element {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureCopy}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </View>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  mediaFrame: {
    height: 300,
    borderRadius: 10,
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
  mediaOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
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
    height: 42,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  motionBubbleIncoming: {
    alignSelf: 'flex-start',
    width: '58%',
    backgroundColor: 'rgba(243, 247, 252, 0.12)',
    borderColor: 'rgba(243, 247, 252, 0.24)',
  },
  motionBubbleOutgoing: {
    alignSelf: 'flex-end',
    width: '70%',
    backgroundColor: 'rgba(49, 181, 255, 0.32)',
    borderColor: 'rgba(49, 181, 255, 0.54)',
  },
  motionBubblePending: {
    alignSelf: 'flex-end',
    width: '48%',
    backgroundColor: 'rgba(53, 211, 154, 0.18)',
    borderColor: 'rgba(53, 211, 154, 0.4)',
  },
  motionRail: {
    height: 2,
    marginTop: spacing.xl,
    overflow: 'hidden',
    borderRadius: 1,
    backgroundColor: 'rgba(134, 160, 188, 0.28)',
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
    minHeight: 34,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 17, 31, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    justifyContent: 'center',
  },
  wordmark: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  panel: {
    paddingHorizontal: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    marginTop: spacing.md,
    maxWidth: 360,
  },
  featureList: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  featureCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  featureTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },
  featureDetail: {
    color: colors.textSubtle,
    fontSize: typography.label,
    lineHeight: 18,
  },
  enterButton: {
    minHeight: touchTarget.minHeight,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  enterText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
