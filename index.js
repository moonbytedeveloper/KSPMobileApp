/**
 * @format
 */

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Background message handler will be set up in App.jsx after Firebase is initialized

AppRegistry.registerComponent(appName, () => App);

// Register background message handler
// Temporarily disabled Firebase messaging to test app without Firebase
// import messaging from '@react-native-firebase/messaging';

// messaging().setBackgroundMessageHandler(async remoteMessage => {
//   console.log('Message handled in the background!', remoteMessage);
//   // You can perform background tasks here
//   // For example, update local storage, sync data, etc.
//   // System notifications will be shown automatically by FCM
// });