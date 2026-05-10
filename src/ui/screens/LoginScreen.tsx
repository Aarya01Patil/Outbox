import {LogIn} from 'lucide-react-native';
import React, {useEffect, useState} from 'react';
import {
  AppState,
  type AppStateStatus,
  Image,
  Pressable,
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
      />
      {!videoReady ? (
        <Image source={loginPoster} resizeMode="cover" style={styles.poster} />
      ) : null}
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Outbox</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Offline-first messaging
          </Text>
          <Text style={styles.body}>
            Send immediately, sync safely, and resolve conflicts without losing
            local work.
          </Text>
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
      </SafeAreaView>
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
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.overlay,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    maxWidth: 340,
  },
  enterButton: {
    minHeight: touchTarget.minHeight,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  enterText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '900',
  },
});
