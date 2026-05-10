import React, {useCallback, useEffect, useState} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {assertDurabilityPragmas, initializeDatabase} from './src/db/database';
import {resetStuckMessages} from './src/queue/messageQueue';
import {registerBackgroundSync} from './src/sync/backgroundSync';
import {ChatScreen} from './src/ui/screens/ChatScreen';
import {LoginScreen} from './src/ui/screens/LoginScreen';

bootstrapPartA();

function bootstrapPartA(): void {
  initializeDatabase();
  assertDurabilityPragmas();
  resetStuckMessages();
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    registerBackgroundSync().catch(error => {
      console.warn('[BackgroundSync] registration failed', error);
    });
  }, []);

  const handleEnter = useCallback(() => {
    setEntered(true);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {entered ? <ChatScreen /> : <LoginScreen onEnter={handleEnter} />}
    </SafeAreaProvider>
  );
}

export default App;
