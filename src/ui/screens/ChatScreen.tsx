import {FlashList} from '@shopify/flash-list';
import {Database, RefreshCw, Send, Sparkles} from 'lucide-react-native';
import React, {useCallback, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useMessages} from '../../hooks/useMessages';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {useSyncStatus} from '../../hooks/useSyncStatus';
import type {MessageRecord} from '../../types/message';
import {MessageRow} from '../components/MessageRow';
import {OfflineBanner} from '../components/OfflineBanner';
import {SkeletonLoader} from '../components/SkeletonLoader';
import {SyncIndicator} from '../components/SyncIndicator';
import {colors, spacing, touchTarget, typography} from '../theme';

const SESSION_ID = 'assignment-session';
const SENDER_ID = 'local-user';
const ESTIMATED_MESSAGE_ROW_HEIGHT = 112;

export function ChatScreen(): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const network = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const {
    messages,
    loading,
    busy,
    messageCount,
    loadedCount,
    sendMessage,
    retryQueuedMessage,
    syncNow,
    seedMessages,
    loadMoreMessages,
  } = useMessages({
    sessionId: SESSION_ID,
    senderId: SENDER_ID,
  });
  const connected = network.isConnected && network.isInternetReachable !== false;
  const canSend = draft.trim().length > 0 && !busy;

  const handleSend = useCallback(() => {
    const message = draft;
    setDraft('');
    sendMessage(message).catch(error => {
      console.warn('[ChatScreen] send failed', error);
    });
  }, [draft, sendMessage]);

  const handleRetry = useCallback(
    (clientId: string) => {
      retryQueuedMessage(clientId).catch(error => {
        console.warn('[ChatScreen] retry failed', error);
      });
    },
    [retryQueuedMessage],
  );

  const handleSyncNow = useCallback(() => {
    syncNow().catch(error => {
      console.warn('[ChatScreen] manual sync failed', error);
    });
  }, [syncNow]);

  const handleSeed = useCallback(() => {
    seedMessages(10_000).catch(error => {
      console.warn('[ChatScreen] seed failed', error);
    });
  }, [seedMessages]);

  const renderItem = useCallback(
    ({item}: {item: MessageRecord}) => (
      <MessageRow message={item} onRetry={handleRetry} />
    ),
    [handleRetry],
  );

  const keyExtractor = useCallback((item: MessageRecord) => item.clientId, []);

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Sparkles color={colors.primary} size={20} strokeWidth={2.2} />
        </View>
        <Text style={styles.emptyTitle}>Nothing in the outbox yet</Text>
        <Text style={styles.emptyBody}>
          Send a message to test the local queue, or seed a large history for
          performance checks.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seed 10000 messages"
          onPress={handleSeed}
          style={styles.emptyAction}
        >
          <Database color={colors.background} size={18} strokeWidth={2.2} />
          <Text style={styles.emptyActionText}>Seed 10,000 messages</Text>
        </Pressable>
      </View>
    ),
    [handleSeed],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Outbox</Text>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text accessibilityRole="header" style={styles.title}>
                Chats
              </Text>
              <Text style={styles.subtleStatus}>
                Reliable local-first delivery with background recovery.
              </Text>
            </View>
            <View style={styles.headerStatus}>
              <OfflineBanner isConnected={connected} />
              <SyncIndicator status={syncStatus} />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Stored messages</Text>
              <Text style={styles.summaryValue}>
                {messageCount.toLocaleString()}
              </Text>
              <Text style={styles.summaryDetail}>
                Showing {loadedCount.toLocaleString()} right now
              </Text>
            </View>
            <View style={styles.toolbarActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sync now"
                onPress={handleSyncNow}
                style={styles.actionButton}
              >
                <RefreshCw color={colors.text} size={18} strokeWidth={2.2} />
                <Text style={styles.actionText}>Sync</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Seed 10000 messages"
                onPress={handleSeed}
                style={styles.actionButtonPrimary}
              >
                <Database color={colors.background} size={18} strokeWidth={2.2} />
                <Text style={styles.actionTextPrimary}>Seed 10k</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.listFrame}>
          {loading ? (
            <SkeletonLoader />
          ) : messages.length === 0 ? (
            listEmpty
          ) : (
            <FlashList
              data={messages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              inverted
              estimatedItemSize={ESTIMATED_MESSAGE_ROW_HEIGHT}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.25}
            />
          )}
        </View>

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message body"
            placeholder="Write a message"
            placeholderTextColor={colors.textSubtle}
            value={draft}
            onChangeText={setDraft}
            multiline
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!canSend}
            onPress={handleSend}
            style={[styles.sendButton, !canSend && styles.disabledButton]}
          >
            <Send color={colors.background} size={20} strokeWidth={2.4} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtleStatus: {
    marginTop: spacing.xs,
    color: colors.textSubtle,
    fontSize: typography.label,
    lineHeight: 18,
  },
  headerStatus: {
    paddingTop: spacing.xs,
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: 184,
  },
  summaryCard: {
    padding: spacing.lg,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryCopy: {
    gap: spacing.xs,
  },
  summaryLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  summaryDetail: {
    color: colors.textMuted,
    fontSize: typography.label,
  },
  toolbarActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  actionButtonPrimary: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.primary,
  },
  actionText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '800',
  },
  actionTextPrimary: {
    color: colors.background,
    fontSize: typography.label,
    fontWeight: '900',
  },
  listFrame: {
    flex: 1,
    minHeight: 1,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 320,
  },
  emptyAction: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyActionText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '900',
  },
  composer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    maxHeight: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: typography.body,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sendButton: {
    width: touchTarget.iconButton,
    height: touchTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
