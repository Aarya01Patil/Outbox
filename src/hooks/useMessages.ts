import {useCallback, useEffect, useMemo, useState} from 'react';

import {localAssignmentMessageSender} from '../api/messagesApi';
import {
  applyServerAuthoritativeMessage,
  enqueueMessage,
  getAllMessagesForSession,
  getMessageByClientId,
  getSessionMessageCount,
  retryMessage,
  seedMessagesForSession,
} from '../queue/messageQueue';
import {runSyncProcessor} from '../queue/syncProcessor';
import {markSyncFailed, markSyncStarted, markSyncSucceeded} from '../sync/syncStatusStore';
import {FOREGROUND_TASK_ID} from '../sync/taskIds';
import type {MessagePriority, MessageRecord} from '../types/message';
import type {ServerMessageSnapshot} from '../types/conflict';

export type ConflictStrategy = 'keepLocal' | 'keepServer';

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
  resolveConflict: (clientId: string, strategy: ConflictStrategy) => void;
  syncNow: () => Promise<void>;
  seedMessages: (count: number) => Promise<void>;
  refreshMessages: () => void;
  loadMoreMessages: () => void;
}

const INITIAL_MESSAGE_PAGE_SIZE = 200;
const MESSAGE_PAGE_INCREMENT = 200;

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
    const now = Date.now();
    markSyncStarted({source: 'foreground', taskId: FOREGROUND_TASK_ID, startedAt: now});
    try {
      const summary = await runSyncProcessor({sender: localAssignmentMessageSender});
      markSyncSucceeded({source: 'foreground', taskId: FOREGROUND_TASK_ID, finishedAt: Date.now(), summary});
      refreshMessages();
    } catch (error: unknown) {
      markSyncFailed({source: 'foreground', taskId: FOREGROUND_TASK_ID, finishedAt: Date.now(), error});
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

      const record = enqueueMessage({
        sessionId: options.sessionId,
        senderId: options.senderId,
        body: trimmedBody,
        priority,
      });

      // Prepend directly — avoids a full DB read just to show the new bubble.
      setMessages(prev => [record, ...prev]);
      setMessageCount(prev => prev + 1);

      runSyncProcessor({sender: localAssignmentMessageSender})
        .then(summary => {
          if (summary.started) {
            markSyncSucceeded({source: 'foreground', taskId: FOREGROUND_TASK_ID, finishedAt: Date.now(), summary});
            refreshMessages();
          }
        })
        .catch(error => {
          if (__DEV__) {
            console.warn('[useMessages] background send sync failed', error);
          }
          markSyncFailed({source: 'foreground', taskId: FOREGROUND_TASK_ID, finishedAt: Date.now(), error});
          refreshMessages();
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

  const resolveConflict = useCallback(
    (clientId: string, strategy: ConflictStrategy) => {
      const message = getMessageByClientId(clientId);

      if (message === null) {
        return;
      }

      if (strategy === 'keepServer' && message.conflictServerBody !== null) {
        const snapshot: ServerMessageSnapshot = {
          clientId: message.clientId,
          serverId: message.serverId ?? `srv_${message.clientId}`,
          serverBody: message.conflictServerBody,
          serverCreatedAt: message.createdAtServer ?? Date.now(),
          serverUpdatedAt: message.conflictServerUpdatedAt ?? Date.now(),
          serverVersion: message.conflictServerVersion ?? 1,
        };
        applyServerAuthoritativeMessage(snapshot);
      } else {
        // keepLocal — re-queue with local body for re-send
        retryMessage({clientId});
      }

      refreshMessages();
    },
    [refreshMessages],
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
      resolveConflict,
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
      resolveConflict,
      retryQueuedMessage,
      seedMessages,
      sendMessage,
      syncNow,
    ],
  );
}
