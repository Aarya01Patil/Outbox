import React, {useCallback, useEffect, useState} from 'react';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {assertDurabilityPragmas, initializeDatabase} from './src/db/database';
import {resetStuckMessages} from './src/queue/messageQueue';
import {registerBackgroundSync} from './src/sync/backgroundSync';
import {ChatScreen} from './src/ui/screens/ChatScreen';
import {ConversationsScreen} from './src/ui/screens/ConversationsScreen';
import {LoginScreen} from './src/ui/screens/LoginScreen';
import {colors} from './src/ui/theme';

function bootstrapPartA(): void {
  initializeDatabase();
  assertDurabilityPragmas();
  resetStuckMessages();
}

type AppScreen = 'login' | 'conversations' | 'chat';

interface ChatTarget {
  sessionId: string;
  sessionName: string;
}

function App(): React.JSX.Element {
  const [appReady, setAppReady] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('login');
  const [chatTarget, setChatTarget] = useState<ChatTarget>({
    sessionId: 'general-chat',
    sessionName: 'General',
  });

  useEffect(() => {
    try {
      bootstrapPartA();
    } catch (e) {
      if (__DEV__) {
        console.warn('[App] DB bootstrap error', e);
      }
    }
    setAppReady(true);
    registerBackgroundSync().catch(error => {
      if (__DEV__) {
        console.warn('[BackgroundSync] registration failed', error);
      }
    });
  }, []);

  const handleEnter = useCallback(() => {
    setScreen('conversations');
  }, []);

  const handleSelectConversation = useCallback(
    (sessionId: string, name: string) => {
      setChatTarget({sessionId, sessionName: name});
      setScreen('chat');
    },
    [],
  );

  const handleBackToConversations = useCallback(() => {
    setScreen('conversations');
  }, []);

  if (!appReady) {
    return <View style={styles.splash} />;
  }

  return (
    <SafeAreaProvider style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {screen === 'login' ? (
        <LoginScreen onEnter={handleEnter} />
      ) : screen === 'conversations' ? (
        <ConversationsScreen onSelectConversation={handleSelectConversation} />
      ) : (
        <ChatScreen
          sessionId={chatTarget.sessionId}
          sessionName={chatTarget.sessionName}
          onBack={handleBackToConversations}
        />
      )}
    </SafeAreaProvider>
  );
}

// Splash + root share the same dark background so iOS does not flash white
// between native splash teardown and first React paint.
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
