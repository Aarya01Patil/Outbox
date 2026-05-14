import {
  ChevronRight,
  Database,
  MessageCircle,
  Briefcase,
  Users,
  Zap,
} from 'lucide-react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {getLastMessageForSession, getSessionMessageCount, seedMessagesForSession} from '../../queue/messageQueue';
import type {MessageRecord} from '../../types/message';
import {useNetworkStatus} from '../../hooks/useNetworkStatus';
import {useSyncStatus} from '../../hooks/useSyncStatus';
import {OfflineBanner} from '../components/OfflineBanner';
import {SkeletonLoader} from '../components/SkeletonLoader';
import {SyncIndicator} from '../components/SyncIndicator';
import {colors, radius, spacing, touchTarget, typography} from '../theme';
import {formatLastMessageTime} from '../utils/time';

export interface Conversation {
  sessionId: string;
  name: string;
  subtitle: string;
  icon: React.JSX.Element;
  accentColor: string;
}

const PRESET_CONVERSATIONS: Conversation[] = [
  {
    sessionId: 'general-chat',
    name: 'General',
    subtitle: 'Open discussion for everyone',
    icon: <MessageCircle color={colors.primary} size={20} strokeWidth={2} />,
    accentColor: colors.primary,
  },
  {
    sessionId: 'work-projects',
    name: 'Work',
    subtitle: 'Project updates and tasks',
    icon: <Briefcase color={colors.warning} size={20} strokeWidth={2} />,
    accentColor: colors.warning,
  },
  {
    sessionId: 'family-group',
    name: 'Family',
    subtitle: 'Stay connected with family',
    icon: <Users color={colors.success} size={20} strokeWidth={2} />,
    accentColor: colors.success,
  },
  {
    sessionId: 'random-vibes',
    name: 'Random',
    subtitle: 'Anything goes here',
    icon: <Zap color={colors.conflict} size={20} strokeWidth={2} />,
    accentColor: colors.conflict,
  },
];

export interface ConversationsScreenProps {
  onSelectConversation: (sessionId: string, name: string) => void;
}

export function ConversationsScreen({
  onSelectConversation,
}: ConversationsScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, MessageRecord | null>>({});
  const [seeding, setSeeding] = useState(false);
  const network = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const connected = network.isConnected && network.isInternetReachable !== false;

  useEffect(() => {
    const newCounts: Record<string, number> = {};
    const newLast: Record<string, MessageRecord | null> = {};

    for (const conv of PRESET_CONVERSATIONS) {
      newCounts[conv.sessionId] = getSessionMessageCount(conv.sessionId);
      newLast[conv.sessionId] = getLastMessageForSession(conv.sessionId);
    }

    setCounts(newCounts);
    setLastMessages(newLast);
    setLoading(false);
  }, []);

  const handleSeedAll = useCallback(() => {
    setSeeding(true);
    setTimeout(() => {
      const newCounts: Record<string, number> = {};
      const newLast: Record<string, MessageRecord | null> = {};

      for (const conv of PRESET_CONVERSATIONS) {
        seedMessagesForSession({
          sessionId: conv.sessionId,
          senderId: 'local-user',
          count: 2500,
        });
        newCounts[conv.sessionId] = getSessionMessageCount(conv.sessionId);
        newLast[conv.sessionId] = getLastMessageForSession(conv.sessionId);
      }

      setCounts(newCounts);
      setLastMessages(newLast);
      setSeeding(false);
    }, 50);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.eyebrow}>Outbox</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Conversations
              </Text>
            </View>
            <View style={styles.statusPills}>
              <OfflineBanner isConnected={connected} />
              <SyncIndicator status={syncStatus} />
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tap a conversation to start messaging offline-first.
          </Text>
        </View>

        {loading ? (
          <SkeletonLoader variant="conversations" />
        ) : (
          <View style={styles.list}>
            {PRESET_CONVERSATIONS.map((conv, index) => (
              <ConversationCard
                key={conv.sessionId}
                conversation={conv}
                messageCount={counts[conv.sessionId] ?? 0}
                lastMessage={lastMessages[conv.sessionId] ?? null}
                index={index}
                onPress={() => onSelectConversation(conv.sessionId, conv.name)}
              />
            ))}
          </View>
        )}

        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Developer Tools</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Seed 10000 messages across all conversations"
            onPress={handleSeedAll}
            disabled={seeding}
            style={({pressed}) => [
              styles.seedButton,
              pressed && styles.buttonPressed,
              seeding && styles.buttonDisabled,
            ]}
          >
            <Database color={colors.background} size={16} strokeWidth={2.2} />
            <Text style={styles.seedText}>
              {seeding ? 'Seeding…' : 'Seed 10k total (2.5k each)'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  messageCount: number;
  lastMessage: MessageRecord | null;
  index: number;
  onPress: () => void;
}

function ConversationCard({
  conversation,
  messageCount,
  lastMessage,
  index,
  onPress,
}: ConversationCardProps): React.JSX.Element {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${conversation.name} conversation`}
        onPress={onPress}
        style={({pressed}) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <View
          style={[
            styles.cardIcon,
            {backgroundColor: `${conversation.accentColor}15`},
          ]}
        >
          {conversation.icon}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardRow}>
            <Text style={styles.cardName}>{conversation.name}</Text>
            {lastMessage !== null ? (
              <Text style={styles.cardTime}>
                {formatLastMessageTime(lastMessage.createdAtClient)}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardPreviewRow}>
            {lastMessage !== null ? (
              <Text style={styles.cardPreview} numberOfLines={1}>
                {lastMessage.direction === 'outgoing' ? 'You: ' : ''}
                {lastMessage.body}
              </Text>
            ) : (
              <Text style={styles.cardSubtitle} numberOfLines={1}>{conversation.subtitle}</Text>
            )}
            {messageCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{messageCount.toLocaleString()}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <ChevronRight color={colors.textSubtle} size={18} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: typography.label,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  statusPills: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
    transform: [{scale: 0.98}],
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
    flex: 1,
  },
  cardTime: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '600',
  },
  cardSubtitle: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  cardPreview: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: typography.caption,
    lineHeight: 16,
  },
  cardPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countBadge: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryGlow,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(49, 181, 255, 0.3)',
  },
  countBadgeText: {
    color: colors.primary,
    fontSize: typography.tiny,
    fontWeight: '700',
  },
  devSection: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  devLabel: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  seedButton: {
    minHeight: touchTarget.minHeight,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  seedText: {
    color: colors.background,
    fontSize: typography.label,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{scale: 0.97}],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
