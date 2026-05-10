import {FlashList} from '@shopify/flash-list';
import {Database, RefreshCw, Send} from 'lucide-react-native';
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
      <View style={styles.invertedListChild}>
        <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptyBody}>
          Send a message or seed 10,000 rows to test FlashList performance.
        </Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>Outbox</Text>
            <Text accessibilityRole="header" style={styles.title}>
              Chats
            </Text>
            <Text style={styles.subtleStatus}>
              Low latency local queue. {messageCount.toLocaleString()} stored.
            </Text>
          </View>
          <View style={styles.headerStatus}>
            <OfflineBanner isConnected={connected} />
            <SyncIndicator status={syncStatus} />
          </View>
        </View>

        <View style={styles.toolbar}>
          <Text style={styles.count}>
            Showing {loadedCount.toLocaleString()} of{' '}
            {messageCount.toLocaleString()}
          </Text>
          <View style={styles.toolbarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sync now"
              onPress={handleSyncNow}
              style={styles.iconButton}
            >
              <RefreshCw color={colors.text} size={18} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seed 10000 messages"
              onPress={handleSeed}
              style={styles.iconButton}
            >
              <Database color={colors.text} size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.listFrame}>
          {loading ? (
            <SkeletonLoader />
          ) : (
            <FlashList
              data={messages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              inverted
              estimatedItemSize={ESTIMATED_MESSAGE_ROW_HEIGHT}
              ListEmptyComponent={listEmpty}
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
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  titleBlock: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtleStatus: {
    marginTop: spacing.xs,
    color: colors.textSubtle,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  headerStatus: {
    alignItems: 'flex-end',
  },
  toolbar: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  count: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: '700',
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: touchTarget.iconButton,
    height: touchTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  listFrame: {
    flex: 1,
    minHeight: 1,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  invertedListChild: {
    transform: [{scaleY: -1}],
  },
  emptyState: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.subtitle,
    fontWeight: '900',
  },
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  composer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: touchTarget.minHeight,
    maxHeight: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
    lineHeight: 22,
  },
  sendButton: {
    width: touchTarget.iconButton,
    height: touchTarget.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
