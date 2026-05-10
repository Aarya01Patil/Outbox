import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock3,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react-native';
import React, {memo, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import type {MessageRecord, MessageStatus} from '../../types/message';
import {colors, spacing, touchTarget, typography} from '../theme';

export interface MessageRowProps {
  message: MessageRecord;
  onRetry: (clientId: string) => void;
}

interface StatusPresentation {
  label: string;
  detail: string;
  tone: 'muted' | 'success' | 'warning' | 'danger' | 'conflict';
}

function MessageRowComponent({message, onRetry}: MessageRowProps): React.JSX.Element {
  const isOutgoing = message.direction === 'outgoing';
  const status = getStatusPresentation(message.status);
  const timestamp = useMemo(
    () =>
      new Date(message.createdAtClient).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [message.createdAtClient],
  );
  const canRetry = message.status === 'failed' || message.status === 'conflicted';

  return (
    <View
      style={[styles.row, isOutgoing ? styles.outgoingRow : styles.incomingRow]}
      accessibilityLabel={`${isOutgoing ? 'Outgoing' : 'Incoming'} message. ${
        status.label
      }`}
    >
      <View
        style={[
          styles.bubble,
          isOutgoing ? styles.outgoingBubble : styles.incomingBubble,
          message.status === 'conflicted' && styles.conflictBubble,
        ]}
      >
        <Text style={styles.body}>{message.body}</Text>
        {message.status === 'conflicted' && message.conflictServerBody !== null ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictLabel}>Server version</Text>
            <Text style={styles.conflictText}>{message.conflictServerBody}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.time}>{timestamp}</Text>
          <View style={styles.statusGroup}>
            <StatusIcon status={message.status} />
            <Text style={[styles.status, styles[status.tone]]}>{status.label}</Text>
          </View>
        </View>
        {message.lastError !== null ? (
          <Text style={styles.errorText}>{message.lastError}</Text>
        ) : null}
        {canRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry message ${message.clientId}`}
            hitSlop={spacing.sm}
            onPress={() => onRetry(message.clientId)}
            style={styles.retryButton}
          >
            <RefreshCw color={colors.text} size={16} strokeWidth={2.2} />
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StatusIcon({status}: {status: MessageStatus}): React.JSX.Element {
  const iconColor = getStatusColor(status);

  switch (status) {
    case 'queued':
      return <Clock3 color={iconColor} size={14} strokeWidth={2.2} />;
    case 'sending':
      return <Send color={iconColor} size={14} strokeWidth={2.2} />;
    case 'sent':
      return <Check color={iconColor} size={14} strokeWidth={2.2} />;
    case 'delivered':
      return <CheckCheck color={iconColor} size={14} strokeWidth={2.2} />;
    case 'failed':
      return <XCircle color={iconColor} size={14} strokeWidth={2.2} />;
    case 'conflicted':
      return <AlertTriangle color={iconColor} size={14} strokeWidth={2.2} />;
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  outgoingRow: {
    alignItems: 'flex-end',
  },
  incomingRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    minWidth: 132,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  outgoingBubble: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  incomingBubble: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  conflictBubble: {
    borderColor: colors.conflict,
  },
  body: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.caption,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  status: {
    fontSize: typography.caption,
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
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  conflictBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  conflictLabel: {
    color: colors.conflict,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  conflictText: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: typography.label,
    lineHeight: 18,
  },
  retryButton: {
    minHeight: touchTarget.minHeight,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  retryText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
  },
});
