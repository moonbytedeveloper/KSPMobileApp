import React, { useState, useEffect } from 'react'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/Splash/SplashScreen';
import { UserProvider } from './src/contexts/UserContext';
import { NotificationProvider, useNotification } from './src/contexts/NotificationContext';
import * as Sentry from '@sentry/react-native';
import notificationService from './src/services/notificationService';

Sentry.init({
  dsn: 'https://c4a9c2159d3754893c866b3165e24143@o4509955823894529.ingest.de.sentry.io/4509956245028944',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Component to connect notification service with context
const NotificationConnector = () => {
  const { showNotification } = useNotification();

  useEffect(() => {
    // Connect notification service with the context
    notificationService.setNotificationCallback(showNotification);
  }, [showNotification]);

  return null;
};


function App() {
  const [isSplashFinished, setIsSplashFinished] = useState(false);

  useEffect(() => {
    // Initialize notifications for receiving
    const initializeNotifications = async () => {
      try {
        console.log('🔔 Initializing notification service...');
        
        // Initialize Firebase messaging handlers first
        notificationService.initialize();
        
        // First check if permission is already granted
        const hasExistingPermission = await notificationService.checkPermissionStatus();
        
        if (hasExistingPermission) {
          console.log('✅ Notification permission already granted');
          // Still need to register device for remote messages
          console.log('🔧 Registering device for remote messages...');
          await notificationService.registerDeviceForRemoteMessages();
          console.log('🔧 Device registration completed');
        } else {
          console.log('📱 Requesting notification permission...');
          // Request permission to receive notifications
          const hasPermission = await notificationService.requestPermission();
          
          if (!hasPermission) {
            console.log('❌ Notification permission denied');
            console.log('User will not receive push notifications. They can enable it later in device settings.');
            return;
          }
          
          // Register device after permission is granted
          console.log('🔧 Registering device for remote messages...');
          await notificationService.registerDeviceForRemoteMessages();
          console.log('🔧 Device registration completed');
        }
        
        // Get FCM token (for debugging - you can share this with notification senders)
        console.log('🔑 Attempting to get FCM token...');
        const token = await notificationService.getToken();
        if (token) {
          console.log('🔑 FCM Token for this device:', token);
          console.log('Share this token with your notification sender to send you notifications');
        }
        
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    // Initialize notifications when app starts
    initializeNotifications();
  }, []);

  const handleSplashFinish = () => {
    setIsSplashFinished(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <UserProvider>
            <NotificationProvider>
              <NotificationConnector />
              {!isSplashFinished ? (
                <SplashScreen onFinish={handleSplashFinish} />
              ) : (
                <AppNavigator />
              )}
            </NotificationProvider>
          </UserProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
export default Sentry.wrap(App);
