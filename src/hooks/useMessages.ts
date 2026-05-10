import {useCallback, useEffect, useMemo, useState} from 'react';

import {localAssignmentMessageSender} from '../api/messagesApi';
import {
  enqueueMessage,
  getAllMessagesForSession,
  getSessionMessageCount,
  retryMessage,
  seedMessagesForSession,
} from '../queue/messageQueue';
import {runSyncProcessor} from '../queue/syncProcessor';
import type {MessagePriority, MessageRecord} from '../types/message';

export interface UseMessagesOptions {
  sessionId: string;
  senderId: string;
}

export interface UseMessagesResult {
  messages: MessageRecord[];
  loading: boolean;
  busy: boolean;
  messageCount: number;
  loadedCount: number;
  sendMessage: (body: string, priority?: MessagePriority) => Promise<void>;
  retryQueuedMessage: (clientId: string) => Promise<void>;
  syncNow: () => Promise<void>;
  seedMessages: (count: number) => Promise<void>;
  refreshMessages: () => void;
  loadMoreMessages: () => void;
}

const INITIAL_MESSAGE_PAGE_SIZE = 120;
const MESSAGE_PAGE_INCREMENT = 160;

export function useMessages(options: UseMessagesOptions): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadedLimit, setLoadedLimit] = useState(INITIAL_MESSAGE_PAGE_SIZE);
  const [messageCount, setMessageCount] = useState(0);

  const refreshMessages = useCallback(() => {
    setMessages(getAllMessagesForSession(options.sessionId, loadedLimit));
    setMessageCount(getSessionMessageCount(options.sessionId));
    setLoading(false);
  }, [loadedLimit, options.sessionId]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  const syncNow = useCallback(async () => {
    setBusy(true);
    try {
      await runSyncProcessor({sender: localAssignmentMessageSender});
      refreshMessages();
    } finally {
      setBusy(false);
    }
  }, [refreshMessages]);

  const sendMessage = useCallback(
    async (body: string, priority: MessagePriority = 'normal') => {
      const trimmedBody = body.trim();

      if (trimmedBody.length === 0) {
        return;
      }

      enqueueMessage({
        sessionId: options.sessionId,
        senderId: options.senderId,
        body: trimmedBody,
        priority,
      });
      refreshMessages();
      runSyncProcessor({sender: localAssignmentMessageSender})
        .then(refreshMessages)
        .catch(error => {
          console.warn('[useMessages] background send sync failed', error);
        });
    },
    [options.senderId, options.sessionId, refreshMessages],
  );

  const retryQueuedMessage = useCallback(
    async (clientId: string) => {
      retryMessage({clientId});
      refreshMessages();
      await syncNow();
    },
    [refreshMessages, syncNow],
  );

  const seedMessages = useCallback(
    async (count: number) => {
      setBusy(true);
      try {
        seedMessagesForSession({
          sessionId: options.sessionId,
          senderId: options.senderId,
          count,
        });
        setLoadedLimit(INITIAL_MESSAGE_PAGE_SIZE);
        setMessages(
          getAllMessagesForSession(options.sessionId, INITIAL_MESSAGE_PAGE_SIZE),
        );
        setMessageCount(getSessionMessageCount(options.sessionId));
        setLoading(false);
      } finally {
        setBusy(false);
      }
    },
    [options.senderId, options.sessionId],
  );

  const loadMoreMessages = useCallback(() => {
    if (messages.length >= messageCount) {
      return;
    }

    setLoadedLimit(currentLimit =>
      Math.min(currentLimit + MESSAGE_PAGE_INCREMENT, messageCount),
    );
  }, [messageCount, messages.length]);

  return useMemo(
    () => ({
      messages,
      loading,
      busy,
      messageCount,
      loadedCount: messages.length,
      sendMessage,
      retryQueuedMessage,
      syncNow,
      seedMessages,
      refreshMessages,
      loadMoreMessages,
    }),
    [
      busy,
      loading,
      loadMoreMessages,
      messageCount,
      messages,
      refreshMessages,
      retryQueuedMessage,
      seedMessages,
      sendMessage,
      syncNow,
    ],
  );
}
