import {AlertTriangle, Check, RotateCcw, X} from 'lucide-react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type {MessageRecord} from '../../types/message';
import type {ConflictStrategy} from '../../hooks/useMessages';
import {colors, spacing, touchTarget, typography} from '../theme';

export interface ConflictSheetProps {
  visible: boolean;
  message: MessageRecord | null;
  onResolve: (clientId: string, strategy: ConflictStrategy) => void;
  onDismiss: () => void;
}

export function ConflictSheet({
  visible,
  message,
  onResolve,
  onDismiss,
}: ConflictSheetProps): React.JSX.Element {
  // Keep last non-null message so the exit animation has content to render.
  const [stableMessage, setStableMessage] = useState(message);
  useEffect(() => {
    if (message !== null) {
      setStableMessage(message);
    }
  }, [message]);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const handleKeepLocal = useCallback(() => {
    if (message !== null) {
      onResolve(message.clientId, 'keepLocal');
    }
    onDismiss();
  }, [message, onResolve, onDismiss]);

  const handleKeepServer = useCallback(() => {
    if (message !== null) {
      onResolve(message.clientId, 'keepServer');
    }
    onDismiss();
  }, [message, onResolve, onDismiss]);

  if (stableMessage === null) {
    return <></>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, {opacity: backdropAnim}]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, {transform: [{translateY: slideAnim}]}]}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <AlertTriangle color={colors.conflict} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Conflict Detected</Text>
              <Text style={styles.subtitle}>
                {stableMessage.conflictReason === 'server-newer'
                  ? 'The server has a newer version of this message'
                  : 'Duplicate message detected on server'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close conflict sheet"
              onPress={onDismiss}
              style={styles.closeButton}
            >
              <X color={colors.textSubtle} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.comparison}>
            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>Your Version</Text>
              <View style={[styles.versionBody, styles.localBody]}>
                <Text style={styles.versionText}>
                  {stableMessage.conflictLocalBody ?? stableMessage.body}
                </Text>
              </View>
            </View>

            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>Server Version</Text>
              <View style={[styles.versionBody, styles.serverBody]}>
                <Text style={styles.versionText}>
                  {stableMessage.conflictServerBody ?? 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep my version"
              onPress={handleKeepLocal}
              style={[styles.actionButton, styles.localAction]}
            >
              <RotateCcw color={colors.primary} size={18} strokeWidth={2.2} />
              <Text style={styles.localActionText}>Keep Mine & Resend</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Accept server version"
              onPress={handleKeepServer}
              style={[styles.actionButton, styles.serverAction]}
            >
              <Check color={colors.background} size={18} strokeWidth={2.4} />
              <Text style={styles.serverActionText}>Accept Server</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayHeavy,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(185, 147, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(185, 147, 255, 0.3)',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  comparison: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  versionCard: {
    gap: spacing.xs,
  },
  versionLabel: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  versionBody: {
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  localBody: {
    backgroundColor: 'rgba(49, 181, 255, 0.08)',
    borderColor: 'rgba(49, 181, 255, 0.25)',
  },
  serverBody: {
    backgroundColor: 'rgba(185, 147, 255, 0.08)',
    borderColor: 'rgba(185, 147, 255, 0.25)',
  },
  versionText: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  vsDivider: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  vsText: {
    color: colors.textSubtle,
    fontSize: typography.caption,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  localAction: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  serverAction: {
    backgroundColor: colors.conflict,
  },
  localActionText: {
    color: colors.primary,
    fontSize: typography.label,
    fontWeight: '800',
  },
  serverActionText: {
    color: colors.background,
    fontSize: typography.label,
    fontWeight: '900',
  },
});
