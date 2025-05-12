// NotificationRoutes.js - Routes for notification operations
import express from 'express';
import NotificationController from '../controllers/NotificationController.js';

const router = express.Router();
const notificationController = new NotificationController();

// Send notification to a user
router.post('/send/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notificationData = req.body;
    
    if (!notificationData || !notificationData.content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Notification content is required' 
      });
    }
    
    const result = await notificationController.sendNotification(userId, notificationData);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in send notification route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const options = req.query;
    const result = await notificationController.getUserNotifications(userId, options);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get notifications route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark notification as read
router.put('/read/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    const result = await notificationController.markAsRead(userId, notificationId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in mark as read route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark all notifications as read
router.put('/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await notificationController.markAllAsRead(userId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in mark all as read route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete notification
router.delete('/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    const result = await notificationController.deleteNotification(userId, notificationId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in delete notification route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Clear all notifications
router.delete('/clear-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await notificationController.clearAllNotifications(userId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in clear all notifications route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get unread notification count
router.get('/unread/count/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await notificationController.getUnreadCount(userId);
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error in get unread count route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Broadcast notification to all users (admin only)
router.post('/broadcast', async (req, res) => {
  try {
    const { users, notificationData } = req.body;
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Users array is required' 
      });
    }
    
    if (!notificationData || !notificationData.content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Notification content is required' 
      });
    }
    
    const result = await notificationController.broadcastNotification(users, notificationData);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in broadcast notification route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Clean up expired notifications (admin only)
router.post('/cleanup-expired', async (req, res) => {
  try {
    const result = await notificationController.cleanupExpiredNotifications();
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in cleanup expired notifications route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
