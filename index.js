/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  registerBackgroundFetchHeadlessTask,
  registerWorkManagerHeadlessTask,
} from './src/sync/backgroundSync';

registerBackgroundFetchHeadlessTask();
registerWorkManagerHeadlessTask();
AppRegistry.registerComponent(appName, () => App);
