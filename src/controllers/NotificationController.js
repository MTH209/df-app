// NotificationController.js - Handles notification logic
import Notification from '../models/MongoNotificationModel.js';
import User from '../models/MongoUserModel.js';

class NotificationController {
  constructor() {
    // No need to initialize any model instance with MongoDB
  }

  // Send a notification to a user
  async sendNotification(telegramId, notificationData) {
    try {
      // Validate notification data
      if (!notificationData || !notificationData.content) {
        return {
          success: false,
          message: 'Notification content is required'
        };
      }

      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Create notification data object
      const notificationToSave = {
        userId: user._id,
        title: notificationData.title || 'Notification',
        content: notificationData.content,
        type: notificationData.type || 'SYSTEM',
        read: false
      };

      // Add related data if provided
      if (notificationData.relatedData) {
        notificationToSave.relatedData = notificationData.relatedData;
      }

      // Add expiration if provided
      if (notificationData.expiresAt) {
        notificationToSave.expiresAt = notificationData.expiresAt;
      }

      // Create the notification
      const notification = await Notification.createNotification(notificationToSave);
      
      return {
        success: true,
        message: 'Notification sent successfully',
        notification
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        message: 'Failed to send notification: ' + error.message
      };
    }
  }

  // Get user notifications with optional filters
  async getUserNotifications(telegramId, options = {}) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          notifications: []
        };
      }

      // Set up query options
      const limit = options.limit || 20;
      const query = { userId: user._id };
      
      // Add read status filter if provided
      if (options.readStatus === 'read') {
        query.read = true;
      } else if (options.readStatus === 'unread') {
        query.read = false;
      }
      
      // Add type filter if provided
      if (options.type) {
        query.type = options.type;
      }

      // Get notifications using the mongoose model
      let notifications;
      if (options.readStatus === 'unread') {
        notifications = await Notification.findUnreadByUserId(user._id);
      } else {
        notifications = await Notification.findByUserId(user._id, limit);
      }
      
      return {
        success: true,
        count: notifications.length,
        notifications
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return {
        success: false,
        message: 'Failed to get notifications: ' + error.message,
        notifications: []
      };
    }
  }

  // Mark a notification as read
  async markAsRead(telegramId, notificationId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Find the notification
      const notification = await Notification.findOne({
        _id: notificationId,
        userId: user._id
      });
      
      if (!notification) {
        return {
          success: false,
          message: 'Notification not found'
        };
      }

      // Mark as read if not already read
      if (!notification.read) {
        await notification.markAsRead();
      }
      
      return {
        success: true,
        message: 'Notification marked as read'
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        message: 'Failed to mark notification as read: ' + error.message
      };
    }
  }

  // Mark all notifications as read
  async markAllAsRead(telegramId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Mark all as read
      const result = await Notification.markAllAsRead(user._id);
      
      return {
        success: true,
        message: `${result.modifiedCount} notifications marked as read`
      };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        message: 'Failed to mark notifications as read: ' + error.message
      };
    }
  }

  // Delete a notification
  async deleteNotification(telegramId, notificationId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Delete the notification
      const result = await Notification.deleteOne({
        _id: notificationId,
        userId: user._id
      });
      
      if (result.deletedCount === 0) {
        return {
          success: false,
          message: 'Notification not found'
        };
      }
      
      return {
        success: true,
        message: 'Notification deleted'
      };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        message: 'Failed to delete notification: ' + error.message
      };
    }
  }

  // Clear all notifications
  async clearAllNotifications(telegramId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Delete all notifications for the user
      const result = await Notification.deleteMany({ userId: user._id });
      
      return {
        success: true,
        message: `${result.deletedCount} notifications cleared`
      };
    } catch (error) {
      console.error('Error clearing notifications:', error);
      return {
        success: false,
        message: 'Failed to clear notifications: ' + error.message
      };
    }
  }

  // Get unread notification count
  async getUnreadCount(telegramId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId });
      if (!user) {
        return 0;
      }

      // Get count of unread notifications
      return await Notification.countUnread(user._id);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Send a system notification to all users (for admin use)
  async broadcastNotification(users, notificationData) {
    try {
      const results = [];
      
      // Process each user sequentially to avoid overwhelming database
      for (const user of users) {
        const result = await this.sendNotification(user.telegramId, notificationData);
        results.push({
          userId: user.telegramId,
          success: result.success
        });
      }
      
      const successCount = results.filter(r => r.success).length;
      
      return {
        success: true,
        message: `Notification broadcast to ${successCount} of ${results.length} users`,
        results
      };
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      return {
        success: false,
        message: 'Failed to broadcast notification: ' + error.message,
        results: []
      };
    }
  }

  // Clean up expired notifications (can be run via scheduled task)
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteExpired();
      return {
        success: true,
        message: `Deleted ${result.deletedCount} expired notifications`
      };
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return {
        success: false,
        message: 'Failed to clean up notifications: ' + error.message
      };
    }
  }
}

export default NotificationController;
