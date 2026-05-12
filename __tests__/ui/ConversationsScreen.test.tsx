import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react-native';

import {ConversationsScreen} from '../../src/ui/screens/ConversationsScreen';

jest.mock('../../src/queue/messageQueue', () => ({
  getSessionMessageCount: jest.fn(() => 0),
  getLastMessageForSession: jest.fn(() => null),
  seedMessagesForSession: jest.fn(),
}));

jest.mock('../../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
}));

jest.mock('../../src/hooks/useSyncStatus', () => ({
  useSyncStatus: () => ({
    phase: 'idle',
    source: null,
    taskId: null,
    startedAt: null,
    finishedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastTimeoutAt: null,
    lastErrorMessage: null,
    lastSummary: null,
    runCount: 0,
    successCount: 0,
    failureCount: 0,
    timeoutCount: 0,
  }),
}));

describe('ConversationsScreen', () => {
  it('renders all four preset conversation cards from SQLite-backed counts', () => {
    // op-sqlite reads are synchronous on the native side, so the screen flips
    // out of its loading state inside the same render cycle. No skeleton flash.
    render(<ConversationsScreen onSelectConversation={jest.fn()} />);

    expect(screen.getByText('General')).toBeTruthy();
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('Family')).toBeTruthy();
    expect(screen.getByText('Random')).toBeTruthy();
  });

  it('navigates to chat when a conversation is tapped', () => {
    const onSelect = jest.fn<void, [string, string]>();

    render(<ConversationsScreen onSelectConversation={onSelect} />);

    fireEvent.press(
      screen.getByRole('button', {name: 'Open General conversation'}),
    );

    expect(onSelect).toHaveBeenCalledWith('general-chat', 'General');
  });

  it('displays the Conversations header', () => {
    render(<ConversationsScreen onSelectConversation={jest.fn()} />);

    expect(screen.getByText('Conversations')).toBeTruthy();
  });
});
