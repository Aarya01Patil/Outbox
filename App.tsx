import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, Text, useColorScheme, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {assertDurabilityPragmas, initializeDatabase} from './src/db/database';
import {resetStuckMessages} from './src/queue/messageQueue';
import {registerBackgroundSync} from './src/sync/backgroundSync';

interface PartABootstrapState {
  resetCount: number;
}

const partABootstrapState = bootstrapPartA();

function bootstrapPartA(): PartABootstrapState {
  initializeDatabase();
  assertDurabilityPragmas();

  return {
    resetCount: resetStuckMessages(),
  };
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    void registerBackgroundSync().catch(error => {
      console.warn('[BackgroundSync] registration failed', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Part A ready</Text>
        <Text style={styles.title}>Offline Queue Initialized</Text>
        <Text style={styles.body}>
          SQLite is open in WAL mode with synchronous FULL durability. Stuck
          sending messages reset before this screen rendered:{' '}
          {partABootstrapState.resetCount}.
        </Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
    gap: 12,
  },
  eyebrow: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    color: '#CBD5E1',
    fontSize: 16,
    lineHeight: 24,
  },
});

export default App;
