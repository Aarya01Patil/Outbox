import {FlashList} from '@shopify/flash-list';
import {
  ArrowLeft,
  Database,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react-native';
import React, {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import type {ConflictStrategy} from '../../hooks/useMessages';
import {ConflictSheet} from '../components/ConflictSheet';
import {MessageRow} from '../components/MessageRow';
import {OfflineBanner} from '../components/OfflineBanner';
import {SkeletonLoader} from '../components/SkeletonLoader';
import {SyncIndicator} from '../components/SyncIndicator';
import {colors, radius, spacing, touchTarget, typography} from '../theme';

// Calibrated to typical single-line message height after paddingVertical:6 per row.
const ESTIMATED_MESSAGE_ROW_HEIGHT = 80;

export interface ChatScreenProps {
  sessionId: string;
  sessionName: string;
  onBack: () => void;
}

export function ChatScreen({
  sessionId,
  sessionName,
  onBack,
}: ChatScreenProps): React.JSX.Element {
  const [conflictMessage, setConflictMessage] = useState<MessageRecord | null>(null);
  const [conflictSheetVisible, setConflictSheetVisible] = useState(false);
  const network = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const {
    messages,
    loading,
    busy,
    messageCount,
    sendMessage,
    retryQueuedMessage,
    resolveConflict,
    syncNow,
    seedMessages,
    loadMoreMessages,
  } = useMessages({
    sessionId,
    senderId: 'local-user',
  });
  const connected = network.isConnected && network.isInternetReachable !== false;

  const prevConnected = useRef(connected);
  useEffect(() => {
    if (!prevConnected.current && connected) {
      syncNow().catch(() => {});
    }
    prevConnected.current = connected;
  }, [connected, syncNow]);

  const handleRetry = useCallback(
    (clientId: string) => {
      retryQueuedMessage(clientId).catch(error => {
        if (__DEV__) {
          console.warn('[ChatScreen] retry failed', error);
        }
      });
    },
    [retryQueuedMessage],
  );

  const handleConflictTap = useCallback((message: MessageRecord) => {
    setConflictMessage(message);
    setConflictSheetVisible(true);
  }, []);

  const handleResolveConflict = useCallback(
    (clientId: string, strategy: ConflictStrategy) => {
      resolveConflict(clientId, strategy);
    },
    [resolveConflict],
  );

  const handleDismissConflict = useCallback(() => {
    setConflictSheetVisible(false);
    setTimeout(() => setConflictMessage(null), 300);
  }, []);

  const handleSyncNow = useCallback(() => {
    syncNow().catch(error => {
      if (__DEV__) {
        console.warn('[ChatScreen] manual sync failed', error);
      }
    });
  }, [syncNow]);

  const handleSeed = useCallback(() => {
    seedMessages(10_000).catch(error => {
      if (__DEV__) {
        console.warn('[ChatScreen] seed failed', error);
      }
    });
  }, [seedMessages]);

  const renderItem = useCallback(
    ({item}: {item: MessageRecord}) => (
      <MessageRow
        message={item}
        onRetry={handleRetry}
        onConflictTap={handleConflictTap}
      />
    ),
    [handleRetry, handleConflictTap],
  );

  const keyExtractor = useCallback((item: MessageRecord) => item.clientId, []);

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Sparkles color={colors.primary} size={22} strokeWidth={2.2} />
        </View>
        <Text style={styles.emptyTitle}>Start the conversation</Text>
        <Text style={styles.emptyBody}>
          Messages are saved locally first, then synced when connected.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seed 10000 messages"
          onPress={handleSeed}
          style={({pressed}) => [
            styles.emptyAction,
            pressed && styles.buttonPressed,
          ]}
        >
          <Database color={colors.background} size={16} strokeWidth={2.2} />
          <Text style={styles.emptyActionText}>Seed 10k messages</Text>
        </Pressable>
      </View>
    ),
    [handleSeed],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back to conversations"
            onPress={onBack}
            style={({pressed}) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <ArrowLeft color={colors.text} size={20} strokeWidth={2.2} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>
                {sessionName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
                {sessionName}
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {messageCount > 0
                  ? `${messageCount.toLocaleString()} msgs`
                  : 'No messages yet'}
              </Text>
            </View>
          </View>

          {/* compact OfflineBanner prevents header overflow on narrow screens */}
          <View style={styles.headerRight}>
            <OfflineBanner isConnected={connected} compact />
            <SyncIndicator status={syncStatus} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sync now"
              onPress={handleSyncNow}
              style={({pressed}) => [
                styles.iconBtn,
                pressed && styles.buttonPressed,
              ]}
            >
              <RefreshCw color={colors.textMuted} size={16} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <View style={styles.listFrame}>
          {loading ? (
            <SkeletonLoader variant="chat" />
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
              onEndReachedThreshold={0.5}
            />
          )}
        </View>

        {/* draft state isolated in ChatComposer so keystrokes don't re-render the list */}
        <ChatComposer busy={busy} onSend={sendMessage} />
      </KeyboardAvoidingView>

      <ConflictSheet
        visible={conflictSheetVisible}
        message={conflictMessage}
        onResolve={handleResolveConflict}
        onDismiss={handleDismissConflict}
      />
    </SafeAreaView>
  );
}

interface ChatComposerProps {
  busy: boolean;
  onSend: (body: string) => Promise<void>;
}

const ChatComposer = memo(function ChatComposer({
  busy,
  onSend,
}: ChatComposerProps): React.JSX.Element {
  const [draft, setDraft] = useState('');
  const MAX_CHARS = 2000;
  const charCount = draft.length;
  const canSend = charCount > 0 && charCount <= MAX_CHARS && !busy;

  const handleSend = useCallback(() => {
    const message = draft;
    setDraft('');
    onSend(message).catch((error: unknown) => {
      if (__DEV__) {
        console.warn('[ChatScreen] send failed', error);
      }
      setDraft(message);
    });
  }, [draft, onSend]);

  return (
    <View style={styles.composer}>
      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel="Message body"
          placeholder="Write a message…"
          placeholderTextColor={colors.textSubtle}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={MAX_CHARS}
          returnKeyType="send"
          enablesReturnKeyAutomatically
          blurOnSubmit={false}
          onSubmitEditing={canSend ? handleSend : undefined}
          style={styles.input}
        />
        {charCount > MAX_CHARS * 0.8 ? (
          <Text
            style={[
              styles.charCount,
              charCount >= MAX_CHARS && styles.charCountLimit,
            ]}
          >
            {MAX_CHARS - charCount}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!canSend}
        onPress={handleSend}
        style={({pressed}) => [
          styles.sendButton,
          !canSend && styles.disabledButton,
          pressed && canSend && styles.sendPressed,
        ]}
      >
        <Send color={colors.background} size={18} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  headerMeta: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listFrame: {
    flex: 1,
    minHeight: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xs,
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
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(49, 181, 255, 0.3)',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.subtitle + 2,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyAction: {
    minHeight: touchTarget.minHeight,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyActionText: {
    color: colors.background,
    fontSize: typography.label,
    fontWeight: '900',
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
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    minHeight: 44,
    maxHeight: 112,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.sm + 2,
    borderRadius: radius.lg,
    color: colors.text,
    backgroundColor: colors.background,
    fontSize: typography.body,
    lineHeight: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  charCount: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.xs,
    fontSize: typography.tiny,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  charCountLimit: {
    color: colors.danger,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  sendPressed: {
    transform: [{scale: 0.92}],
    backgroundColor: colors.primaryDark,
  },
  disabledButton: {
    opacity: 0.35,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{scale: 0.95}],
  },
});
