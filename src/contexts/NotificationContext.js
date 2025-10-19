import React, { createContext, useContext, useState } from 'react';
import NotificationBottomSheet from '../components/common/NotificationBottomSheet';
import { getNavigationRef } from '../api/axios';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const showNotification = (notificationData) => {
    setNotification(notificationData);
    setIsVisible(true);
  };

  const hideNotification = () => {
    setIsVisible(false);
    setNotification(null);
  };

  const handleNotificationPress = (notificationData) => {
    // Handle notification press - navigate to Notification screen
    console.log('Notification pressed:', notificationData);
    
    // Navigate to Notification screen using global navigation reference
    const navigation = getNavigationRef();
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Notification');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        hideNotification,
        notification,
        isVisible,
      }}
    >
      {children}
      <NotificationBottomSheet
        visible={isVisible}
        notification={notification}
        onDismiss={hideNotification}
        onPress={handleNotificationPress}
      />
    </NotificationContext.Provider>
  );
};
