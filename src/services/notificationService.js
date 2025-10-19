import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import universalLinkService from './universalLinkService';

class NotificationService {
  constructor() {
    this.notificationCallback = null;
    this.isInitialized = false;
  }

  // Initialize Firebase messaging handlers
  initialize() {
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.setupMessageHandlers();
      this.isInitialized = true;
      console.log('✅ Firebase messaging handlers initialized');
    } catch (error) {
      console.error('Error initializing Firebase messaging:', error);
    }
  }

  // Set callback for showing notifications
  setNotificationCallback(callback) {
    this.notificationCallback = callback;
  }

  // Register device for remote messages (iOS requirement)
  async registerDeviceForRemoteMessages() {
    try {
      console.log('🔧 Starting device registration...');
      
      // Check if Firebase is initialized
      if (!this.isInitialized) {
        console.log('Firebase not initialized, initializing now...');
        this.initialize();
      }
      
      console.log('🔧 Calling registerDeviceForRemoteMessages...');
      await messaging().registerDeviceForRemoteMessages();
      console.log('✅ Device registered for remote messages');
    } catch (error) {
      console.error('❌ Device registration error:', error.message);
      console.log('Error details:', error);
    }
  }

  // Request permission for notifications
  async requestPermission() {
    try {
      console.log('Requesting notification permission...');
      
      // Check if Firebase is initialized
      if (!this.isInitialized) {
        console.log('Firebase not initialized, initializing now...');
        this.initialize();
      }
      
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        console.log('Permission status:', authStatus);
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Check current permission status
  async checkPermissionStatus() {
    try {
      // Check if Firebase is initialized
      if (!this.isInitialized) {
        console.log('Firebase not initialized, initializing now...');
        this.initialize();
      }
      
      const authStatus = await messaging().hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      console.log('Current permission status:', authStatus, 'Enabled:', enabled);
      return enabled;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return false;
    }
  }

  // Get FCM token
  async getToken() {
    try {
      console.log('🔑 Starting FCM token request...');
      
      // Check if Firebase is initialized
      if (!this.isInitialized) {
        console.log('Firebase not initialized, initializing now...');
        this.initialize();
      }
      
      console.log('🔑 Calling messaging().getToken()...');
      const token = await messaging().getToken();
      console.log('✅ FCM Token received:', token);
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      console.error('Error details:', error);
      return null;
    }
  }

  // Setup message handlers
  setupMessageHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
      // You can perform background tasks here
      // For example, update local storage, sync data, etc.
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', remoteMessage);
      
      // Show custom bottom sheet notification for foreground messages
      if (Platform.OS === 'android' && remoteMessage.notification) {
        console.log('Foreground notification received:', remoteMessage.notification);
        
        // Show bottom sheet notification
        if (this.notificationCallback) {
          this.notificationCallback(remoteMessage.notification);
        }
      }
    });

    // Handle notification tap when app is in background/quit
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });

    // Handle notification tap when app is quit
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      });
  }

  // Handle notification press
  handleNotificationPress(remoteMessage) {
    // You can navigate to specific screens based on notification data
    const { data } = remoteMessage;
    
    console.log('Notification pressed with data:', data);
    
    // Handle universal link from notification
    if (data?.universalLink) {
      console.log('Opening universal link from notification:', data.universalLink);
      universalLinkService.handleUniversalLink({ url: data.universalLink });
      return;
    }
    
    // Handle deep link from notification
    if (data?.deepLink) {
      console.log('Opening deep link from notification:', data.deepLink);
      universalLinkService.handleUniversalLink({ url: data.deepLink });
      return;
    }
    
    // Handle screen navigation from notification
    if (data?.screen) {
      console.log('Navigate to screen:', data.screen);
      // You can add navigation logic here or use the universal link service
      const universalLink = universalLinkService.generateUniversalLink(`/${data.screen}`, data.params || {});
      universalLinkService.handleUniversalLink({ url: universalLink });
    }
  }

  // Subscribe to topic (optional - for receiving notifications from specific topics)
  async subscribeToTopic(topic) {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Error subscribing to topic:', error);
    }
  }

  // Unsubscribe from topic (optional)
  async unsubscribeFromTopic(topic) {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error('Error unsubscribing from topic:', error);
    }
  }
}

export default new NotificationService();
