import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock3,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react-native';
import React, {memo, useEffect, useMemo, useRef} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';

import type {MessageRecord, MessageStatus} from '../../types/message';
import {colors, radius, spacing, typography} from '../theme';
import {formatMessageTime} from '../utils/time';

export interface MessageRowProps {
  message: MessageRecord;
  onRetry: (clientId: string) => void;
  onConflictTap?: (message: MessageRecord) => void;
}

interface StatusPresentation {
  label: string;
  detail: string;
  tone: 'muted' | 'success' | 'warning' | 'danger' | 'conflict';
}

function MessageRowComponent({message, onRetry, onConflictTap}: MessageRowProps): React.JSX.Element {
  const isOutgoing = message.direction === 'outgoing';
  const status = getStatusPresentation(message.status);
  const timestamp = useMemo(
    () => formatMessageTime(message.createdAtClient),
    [message.createdAtClient],
  );
  const canRetry = message.status === 'failed' || message.status === 'conflicted';
  const isConflicted = message.status === 'conflicted';

  const isNew = message.direction === 'outgoing' &&
    (message.status === 'queued' || message.status === 'sending');
  const fadeAnim = useRef(new Animated.Value(isNew ? 0.6 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNew ? 12 : 0)).current;

  useEffect(() => {
    if (!isNew) {
      // Reset immediately — handles FlashList cell recycling where ref values are stale.
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isNew, fadeAnim, slideAnim]);

  const bubbleContent = (
    <View
      style={[
        styles.bubble,
        isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
        isConflicted && styles.conflictBubble,
        message.status === 'failed' && styles.failedBubble,
      ]}
    >
      <Text style={styles.body}>{message.body}</Text>
      {isConflicted && message.conflictServerBody !== null ? (
        <View style={styles.conflictBox}>
          <Text style={styles.conflictLabel}>Server version</Text>
          <Text style={styles.conflictText} numberOfLines={3}>{message.conflictServerBody}</Text>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.time}>{timestamp}</Text>
        <View style={styles.statusGroup}>
          <StatusIcon status={message.status} />
          <Text style={[styles.status, styles[status.tone]]}>{status.label}</Text>
        </View>
      </View>
      {message.lastError !== null && !isConflicted ? (
        <Text style={styles.errorText} numberOfLines={2}>{message.lastError}</Text>
      ) : null}
      {canRetry && !isConflicted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Retry message ${message.clientId}`}
          hitSlop={spacing.sm}
          onPress={() => onRetry(message.clientId)}
          style={({pressed}) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <RefreshCw color={colors.text} size={14} strokeWidth={2.2} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      ) : null}
      {isConflicted ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Resolve conflict ${message.clientId}`}
          hitSlop={spacing.sm}
          onPress={() => onConflictTap?.(message)}
          style={({pressed}) => [
            styles.resolveButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <AlertTriangle color={colors.conflict} size={14} strokeWidth={2.2} />
          <Text style={styles.resolveText}>Resolve Conflict</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.row,
        isOutgoing ? styles.outgoingRow : styles.incomingRow,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}
      accessibilityLabel={`${isOutgoing ? 'Outgoing' : 'Incoming'} message. ${
        status.label
      }`}
    >
      {bubbleContent}
    </Animated.View>
  );
}

function StatusIcon({status}: {status: MessageStatus}): React.JSX.Element {
  const iconColor = getStatusColor(status);

  switch (status) {
    case 'queued':
      return <Clock3 color={iconColor} size={12} strokeWidth={2.2} />;
    case 'sending':
      return <Send color={iconColor} size={12} strokeWidth={2.2} />;
    case 'sent':
      return <Check color={iconColor} size={12} strokeWidth={2.2} />;
    case 'delivered':
      return <CheckCheck color={iconColor} size={12} strokeWidth={2.2} />;
    case 'failed':
      return <XCircle color={iconColor} size={12} strokeWidth={2.2} />;
    case 'conflicted':
      return <AlertTriangle color={iconColor} size={12} strokeWidth={2.2} />;
  }
}

function getStatusPresentation(status: MessageStatus): StatusPresentation {
  switch (status) {
    case 'queued':
      return {label: 'Queued', detail: 'Waiting to sync', tone: 'muted'};
    case 'sending':
      return {label: 'Sending', detail: 'Sync in progress', tone: 'warning'};
    case 'sent':
      return {label: 'Sent', detail: 'Stored on server', tone: 'success'};
    case 'delivered':
      return {label: 'Delivered', detail: 'Delivered to recipient', tone: 'success'};
    case 'failed':
      return {label: 'Failed', detail: 'Needs retry', tone: 'danger'};
    case 'conflicted':
      return {label: 'Conflict', detail: 'Needs resolution', tone: 'conflict'};
  }
}

function getStatusColor(status: MessageStatus): string {
  switch (status) {
    case 'queued':
      return colors.textSubtle;
    case 'sending':
      return colors.warning;
    case 'sent':
    case 'delivered':
      return colors.success;
    case 'failed':
      return colors.danger;
    case 'conflicted':
      return colors.conflict;
  }
}

export const MessageRow = memo(MessageRowComponent);

const styles = StyleSheet.create({
  row: {
    width: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  incomingRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    minWidth: 104,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  outgoingBubble: {
    backgroundColor: colors.primaryDark,
    borderColor: 'rgba(49, 181, 255, 0.3)',
    borderTopRightRadius: radius.sm,
  },
  incomingBubble: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderTopLeftRadius: radius.sm,
  },
  conflictBubble: {
    borderColor: colors.conflict,
    backgroundColor: 'rgba(185, 147, 255, 0.08)',
  },
  failedBubble: {
    borderColor: 'rgba(255, 124, 119, 0.4)',
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 1,
    gap: spacing.sm,
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    opacity: 0.8,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  status: {
    fontSize: typography.tiny,
    fontWeight: '700',
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
  conflict: {
    color: colors.conflict,
  },
  errorText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.tiny,
    lineHeight: 15,
    fontStyle: 'italic',
  },
  conflictBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.conflictGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(185, 147, 255, 0.2)',
    overflow: 'hidden',
  },
  conflictLabel: {
    color: colors.conflict,
    fontSize: typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conflictText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: 40,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surfaceMuted,
  },
  resolveButton: {
    minHeight: 40,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.conflictGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(185, 147, 255, 0.3)',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{scale: 0.97}],
  },
  retryText: {
    color: colors.text,
    fontSize: typography.caption,
    fontWeight: '800',
  },
  resolveText: {
    color: colors.conflict,
    fontSize: typography.caption,
    fontWeight: '800',
  },
});
