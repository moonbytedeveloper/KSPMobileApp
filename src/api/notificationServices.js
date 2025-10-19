import api from './axios';
import Config from 'react-native-config';

// Notification API paths from environment variables
const PATHS = {
  getNotifications: Config.API_GET_NOTIFICATIONS_PATH || '/api/Notification/GetNotifications',
 // markAsRead: Config.API_MARK_NOTIFICATION_READ_PATH || '/api/Notification/MarkAsRead',
  deleteNotification: Config.API_DELETE_NOTIFICATION_PATH || '/api/Notification/DeleteNotification',
  //deleteMultipleNotifications: Config.API_DELETE_MULTIPLE_NOTIFICATIONS_PATH || '/api/Notification/DeleteMultipleNotifications',
};

console.log('📱 [NOTIFICATION_PATHS] API paths:', PATHS);

/**
 * Notification API services
 */
export const notificationServices = {
  /**
   * Get all notifications for the current user
   * @param {string} userId - The user ID to fetch notifications for
   * @returns {Promise<Object>} API response with notifications data
   */
  getNotifications: async (userId) => {
    try {
      const response = await api.get(PATHS.getNotifications, {
        params: {
          userId: userId
        }
      });
      
      // Log the full response for debugging
      console.log('📱 [NOTIFICATION_API] Full response:', JSON.stringify(response.data, null, 2));
      console.log('📱 [NOTIFICATION_API] Response status:', response.status);
      console.log('📱 [NOTIFICATION_API] Response headers:', response.headers);
      
      return response.data;
    } catch (error) {
      console.error('❌ [NOTIFICATION_API] Error fetching notifications:', error);
      console.error('❌ [NOTIFICATION_API] Error response:', error.response?.data);
      console.error('❌ [NOTIFICATION_API] Error status:', error.response?.status);
      throw error;
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - ID of the notification to mark as read
   * @returns {Promise<Object>} API response
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`${PATHS.markAsRead}/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Delete notification
   * @param {string} uuid - UUID of the notification to delete
   * @returns {Promise<Object>} API response
   */
  deleteNotification: async (uuid) => {
    try {
      const response = await api.delete(PATHS.deleteNotification, {
        params: {
          uuid: uuid
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Delete multiple notifications
  //  * @param {Array<string>} uuids - Array of notification UUIDs to delete
  //  * @returns {Promise<Object>} API response
  //  */
  // deleteMultipleNotifications: async (uuids) => {
  //   try {
  //     const response = await api.post(PATHS.deleteMultipleNotifications, {
  //       uuids: uuids
  //     });
  //     return response.data;
  //   } catch (error) {
  //     console.error('Error deleting multiple notifications:', error);
  //     throw error;
  //   }
  // }
};

export default notificationServices;
