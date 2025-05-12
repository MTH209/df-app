// MongoNotificationModel.js - MongoDB schema and model for notifications/mailbox
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  title: { 
    type: String, 
    required: true
  },
  content: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['SYSTEM', 'QUEST', 'REWARD', 'DRAGON', 'PURCHASE', 'FRIEND', 'EVENT']
  },
  read: { 
    type: Boolean, 
    default: false 
  },
  relatedData: {
    questId: { type: String },
    rewardId: { type: String },
    dragonId: { type: mongoose.Schema.Types.ObjectId },
    transactionId: { type: mongoose.Schema.Types.ObjectId },
    friendId: { type: mongoose.Schema.Types.ObjectId },
    eventId: { type: String }
  },
  expiresAt: {
    type: Date,
    default: null // null means never expires
  }
}, {
  timestamps: true
});

// Static method to create a notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to find unread notifications by user ID
notificationSchema.statics.findUnreadByUserId = function(userId) {
  const now = new Date();
  return this.find({ 
    userId,
    read: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ]
  })
  .sort({ createdAt: -1 });
};

// Static method to find all notifications by user ID
notificationSchema.statics.findByUserId = function(userId, limit = 20) {
  const now = new Date();
  return this.find({ 
    userId,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to count unread notifications
notificationSchema.statics.countUnread = function(userId) {
  const now = new Date();
  return this.countDocuments({ 
    userId,
    read: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ]
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  await this.save();
  return this;
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { $set: { read: true } }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpired = function() {
  const now = new Date();
  return this.deleteMany({
    expiresAt: { $lt: now },
    expiresAt: { $ne: null }
  });
};

// Create system notification helper
notificationSchema.statics.createSystemNotification = async function(userId, title, content) {
  return this.createNotification({
    userId,
    title,
    content,
    type: 'SYSTEM'
  });
};

// Create quest notification helper
notificationSchema.statics.createQuestNotification = async function(userId, title, content, questId) {
  return this.createNotification({
    userId,
    title,
    content,
    type: 'QUEST',
    relatedData: { questId }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
