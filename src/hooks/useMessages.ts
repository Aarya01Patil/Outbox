import {useCallback, useEffect, useMemo, useState} from 'react';

import {localAssignmentMessageSender} from '../api/messagesApi';
import {
  enqueueMessage,
  getAllMessagesForSession,
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
  sendMessage: (body: string, priority?: MessagePriority) => Promise<void>;
  retryQueuedMessage: (clientId: string) => Promise<void>;
  syncNow: () => Promise<void>;
  seedMessages: (count: number) => Promise<void>;
  refreshMessages: () => void;
}

export function useMessages(options: UseMessagesOptions): UseMessagesResult {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refreshMessages = useCallback(() => {
    setMessages(getAllMessagesForSession(options.sessionId));
    setLoading(false);
  }, [options.sessionId]);

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
      await syncNow();
    },
    [options.senderId, options.sessionId, refreshMessages, syncNow],
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
        refreshMessages();
      } finally {
        setBusy(false);
      }
    },
    [options.senderId, options.sessionId, refreshMessages],
  );

  return useMemo(
    () => ({
      messages,
      loading,
      busy,
      messageCount: messages.length,
      sendMessage,
      retryQueuedMessage,
      syncNow,
      seedMessages,
      refreshMessages,
    }),
    [
      busy,
      loading,
      messages,
      refreshMessages,
      retryQueuedMessage,
      seedMessages,
      sendMessage,
      syncNow,
    ],
  );
}
