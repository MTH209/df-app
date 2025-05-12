// MongoFriendModel.js - MongoDB schema and model for friend relationships
import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  friendId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ['PENDING', 'ACCEPTED', 'BLOCKED'],
    default: 'PENDING'
  },
  lastInteraction: { 
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to enforce unique relationships
friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

// Static method to create a friend request
friendSchema.statics.createFriendRequest = async function(userId, friendId) {
  // Check if users are the same
  if (userId.toString() === friendId.toString()) {
    throw new Error('Cannot add yourself as a friend');
  }
  
  // Check if relationship already exists
  const existingRelation = await this.findOne({
    $or: [
      { userId, friendId },
      { userId: friendId, friendId: userId }
    ]
  });
  
  if (existingRelation) {
    throw new Error('Friend relationship already exists');
  }
  
  // Create new friend request
  const friendRequest = new this({
    userId,
    friendId,
    status: 'PENDING'
  });
  
  await friendRequest.save();
  return friendRequest;
};

// Static method to accept a friend request
friendSchema.statics.acceptFriendRequest = async function(userId, friendId) {
  const request = await this.findOne({
    userId: friendId,
    friendId: userId,
    status: 'PENDING'
  });
  
  if (!request) {
    throw new Error('Friend request not found');
  }
  
  request.status = 'ACCEPTED';
  request.lastInteraction = new Date();
  await request.save();
  
  // Create a mirrored relationship (for easier querying)
  const mirroredRequest = new this({
    userId,
    friendId,
    status: 'ACCEPTED'
  });
  await mirroredRequest.save();
  
  return { request, mirroredRequest };
};

// Static method to block a friend
friendSchema.statics.blockFriend = async function(userId, friendId) {
  // Update or create a record with BLOCKED status
  const result = await this.findOneAndUpdate(
    { userId, friendId },
    { 
      userId, 
      friendId, 
      status: 'BLOCKED', 
      lastInteraction: new Date() 
    },
    { upsert: true, new: true }
  );
  
  // Also remove any existing accepted or pending relationship in the other direction
  await this.deleteOne({
    userId: friendId,
    friendId: userId
  });
  
  return result;
};

// Static method to get all friends of a user
friendSchema.statics.getFriendsByUserId = function(userId) {
  return this.find({ 
    userId, 
    status: 'ACCEPTED' 
  })
  .populate('friendId', 'username level')
  .sort({ lastInteraction: -1 });
};

// Static method to get pending friend requests
friendSchema.statics.getPendingRequestsByUserId = function(userId) {
  return this.find({
    friendId: userId,
    status: 'PENDING'
  })
  .populate('userId', 'username level');
};

// Static method to check if users are friends
friendSchema.statics.areFriends = async function(userId1, userId2) {
  const relation = await this.findOne({
    userId: userId1,
    friendId: userId2,
    status: 'ACCEPTED'
  });
  
  return !!relation;
};

// Static method to update last interaction
friendSchema.statics.updateLastInteraction = async function(userId, friendId) {
  await this.updateMany(
    { 
      $or: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ],
      status: 'ACCEPTED'
    },
    { $set: { lastInteraction: new Date() } }
  );
};

const Friend = mongoose.model('Friend', friendSchema);

export default Friend;
