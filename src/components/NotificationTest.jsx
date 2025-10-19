import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import notificationService from '../services/notificationService';

const NotificationTest = () => {
  const [fcmToken, setFcmToken] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('Unknown');

  useEffect(() => {
    checkPermissionStatus();
    getToken();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const hasPermission = await notificationService.requestPermission();
      setPermissionStatus(hasPermission ? 'Granted' : 'Denied');
    } catch (error) {
      console.error('Error checking permission:', error);
      setPermissionStatus('Error');
    }
  };

  const getToken = async () => {
    try {
      const token = await notificationService.getToken();
      setFcmToken(token || 'No token available');
    } catch (error) {
      console.error('Error getting token:', error);
      setFcmToken('Error getting token');
    }
  };

  const subscribeToTestTopic = async () => {
    try {
      await notificationService.subscribeToTopic('test-topic');
      Alert.alert('Success', 'Subscribed to test-topic');
    } catch (error) {
      Alert.alert('Error', 'Failed to subscribe to topic');
    }
  };

  const copyTokenToClipboard = () => {
    // You can implement clipboard functionality here
    Alert.alert('Token', fcmToken);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Notification Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Permission Status:</Text>
        <Text style={[styles.value, permissionStatus === 'Granted' ? styles.success : styles.error]}>
          {permissionStatus}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>FCM Token:</Text>
        <Text style={styles.tokenText} numberOfLines={3}>
          {fcmToken}
        </Text>
        <TouchableOpacity style={styles.button} onPress={copyTokenToClipboard}>
          <Text style={styles.buttonText}>Copy Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.button} onPress={getToken}>
          <Text style={styles.buttonText}>Refresh Token</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={subscribeToTestTopic}>
          <Text style={styles.buttonText}>Subscribe to Test Topic</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to Test:</Text>
        <Text style={styles.instructionText}>
          1. Copy the FCM token above{'\n'}
          2. Go to Firebase Console → Cloud Messaging{'\n'}
          3. Click "Send your first message"{'\n'}
          4. Enter title and message{'\n'}
          5. Select your app and send{'\n'}
          6. Check if notification appears
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  value: {
    fontSize: 14,
    color: '#666',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  tokenText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  instructions: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#E65100',
  },
  instructionText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
});

export default NotificationTest;
