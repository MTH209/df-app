// FriendController.js - Handles friend management logic
import Friend from '../models/MongoFriendModel.js';
import User from '../models/MongoUserModel.js';
import UserController from './UserController.js';

class FriendController {
  constructor(userController) {
    this.userController = userController || new UserController();
  }

  // Send friend request
  async sendFriendRequest(senderTelegramId, receiverUsername) {
    try {
      // Get sender by telegram ID
      const sender = await User.findOne({ telegramId: senderTelegramId });
      if (!sender) {
        return {
          success: false,
          message: 'Sender user not found'
        };
      }

      // Get receiver by username
      const receiver = await User.findOne({ username: receiverUsername });
      if (!receiver) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Check if they're the same user
      if (sender._id.toString() === receiver._id.toString()) {
        return {
          success: false,
          message: 'You cannot add yourself as a friend'
        };
      }

      // Check if already friends or request pending
      const existingRelation = await Friend.findOne({
        $or: [
          { userId: sender._id, friendId: receiver._id },
          { userId: receiver._id, friendId: sender._id }
        ]
      });

      if (existingRelation) {
        if (existingRelation.status === 'ACCEPTED') {
          return {
            success: false,
            message: 'Already friends with this user'
          };
        } else if (existingRelation.status === 'PENDING') {
          if (existingRelation.userId.toString() === sender._id.toString()) {
            return {
              success: false,
              message: 'Friend request already sent'
            };
          } else {
            return {
              success: false,
              message: 'This user has already sent you a friend request. Check your pending requests.'
            };
          }
        } else if (existingRelation.status === 'BLOCKED') {
          return {
            success: false,
            message: 'Unable to send friend request'
          };
        }
      }

      // Create new friend request
      await Friend.createFriendRequest(sender._id, receiver._id);
      
      return {
        success: true,
        message: `Friend request sent to ${receiver.username}`
      };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return {
        success: false,
        message: 'Failed to send friend request: ' + error.message
      };
    }
  }

  // Accept friend request
  async acceptFriendRequest(receiverTelegramId, senderTelegramId) {
    try {
      // Get user IDs from telegram IDs
      const receiver = await User.findOne({ telegramId: receiverTelegramId });
      const sender = await User.findOne({ telegramId: senderTelegramId });
      
      if (!receiver || !sender) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Accept the friend request
      await Friend.acceptFriendRequest(receiver._id, sender._id);
      
      return {
        success: true,
        message: `You are now friends with ${sender.username}`
      };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return {
        success: false,
        message: 'Failed to accept friend request: ' + error.message
      };
    }
  }

  // Reject friend request
  async rejectFriendRequest(receiverTelegramId, senderTelegramId) {
    try {
      // Get user IDs from telegram IDs
      const receiver = await User.findOne({ telegramId: receiverTelegramId });
      const sender = await User.findOne({ telegramId: senderTelegramId });
      
      if (!receiver || !sender) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Find and delete the friend request
      const result = await Friend.deleteOne({
        userId: sender._id,
        friendId: receiver._id,
        status: 'PENDING'
      });
      
      if (result.deletedCount === 0) {
        return {
          success: false,
          message: 'Friend request not found'
        };
      }
      
      return {
        success: true,
        message: 'Friend request rejected'
      };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return {
        success: false,
        message: 'Failed to reject friend request: ' + error.message
      };
    }
  }

  // Remove friend
  async removeFriend(userTelegramId, friendTelegramId) {
    try {
      // Get user IDs from telegram IDs
      const user = await User.findOne({ telegramId: userTelegramId });
      const friend = await User.findOne({ telegramId: friendTelegramId });
      
      if (!user || !friend) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Delete both friendship records (both directions)
      const result = await Friend.deleteMany({
        $or: [
          { userId: user._id, friendId: friend._id },
          { userId: friend._id, friendId: user._id }
        ],
        status: 'ACCEPTED'
      });
      
      if (result.deletedCount === 0) {
        return {
          success: false,
          message: 'Friend relationship not found'
        };
      }
      
      return {
        success: true,
        message: `Removed ${friend.username} from your friends list`
      };
    } catch (error) {
      console.error('Error removing friend:', error);
      return {
        success: false,
        message: 'Failed to remove friend: ' + error.message
      };
    }
  }

  // Get list of friends with user details
  async getFriendsList(userTelegramId) {
    try {
      // Get user by telegram ID
      const user = await User.findOne({ telegramId: userTelegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Get friends using the mongoose model
      const friendships = await Friend.getFriendsByUserId(user._id);
      
      // Transform the data for client consumption
      const friends = friendships.map(friendship => {
        const friendUser = friendship.friendId;
        return {
          id: friendship._id,
          userId: friendUser._id,
          telegramId: friendUser.telegramId,
          username: friendUser.username,
          level: friendUser.level,
          lastSeen: friendUser.lastSeen || null,
          isOnline: (Date.now() - friendUser.lastSeen) < 5 * 60 * 1000, // Online if active in last 5 minutes
          lastInteraction: friendship.lastInteraction
        };
      });
      
      return {
        success: true,
        count: friends.length,
        friends
      };
    } catch (error) {
      console.error('Error getting friends list:', error);
      return {
        success: false,
        message: 'Failed to get friends list: ' + error.message
      };
    }
  }

  // Get list of incoming friend requests with user details
  async getFriendRequests(userTelegramId) {
    try {
      // Get user by telegram ID
      const user = await User.findOne({ telegramId: userTelegramId });
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Get pending requests using the mongoose model
      const pendingRequests = await Friend.getPendingRequestsByUserId(user._id);
      
      // Transform the data for client consumption
      const requests = pendingRequests.map(request => {
        const senderUser = request.userId;
        return {
          id: request._id,
          senderId: senderUser._id,
          telegramId: senderUser.telegramId,
          username: senderUser.username,
          level: senderUser.level,
          timestamp: request.createdAt
        };
      });
      
      return {
        success: true,
        count: requests.length,
        requests
      };
    } catch (error) {
      console.error('Error getting friend requests:', error);
      return {
        success: false,
        message: 'Failed to get friend requests: ' + error.message
      };
    }
  }

  // Find a friend by username for a specific user
  async findFriendByUsername(userTelegramId, friendUsername) {
    try {
      // Get the friends list first
      const friendsResult = await this.getFriendsList(userTelegramId);
      
      if (!friendsResult.success) {
        return null;
      }
      
      // Find the friend with matching username
      return friendsResult.friends.find(friend => 
        friend.username.toLowerCase() === friendUsername.toLowerCase()
      );
    } catch (error) {
      console.error('Error finding friend by username:', error);
      return null;
    }
  }

  // Check if users are friends
  async areFriends(userTelegramId1, userTelegramId2) {
    try {
      // Get user IDs from telegram IDs
      const user1 = await User.findOne({ telegramId: userTelegramId1 });
      const user2 = await User.findOne({ telegramId: userTelegramId2 });
      
      if (!user1 || !user2) {
        return false;
      }

      // Check if they are friends
      return await Friend.areFriends(user1._id, user2._id);
    } catch (error) {
      console.error('Error checking friendship:', error);
      return false;
    }
  }

  // Get friend count
  async getFriendCount(userTelegramId) {
    try {
      // Get user by telegram ID
      const user = await User.findOne({ telegramId: userTelegramId });
      if (!user) {
        return 0;
      }

      // Count friends
      return await Friend.countDocuments({
        userId: user._id,
        status: 'ACCEPTED'
      });
    } catch (error) {
      console.error('Error getting friend count:', error);
      return 0;
    }
  }

  // Get friend request count
  async getFriendRequestCount(userTelegramId) {
    try {
      // Get user by telegram ID
      const user = await User.findOne({ telegramId: userTelegramId });
      if (!user) {
        return 0;
      }

      // Count pending friend requests
      return await Friend.countDocuments({
        friendId: user._id,
        status: 'PENDING'
      });
    } catch (error) {
      console.error('Error getting friend request count:', error);
      return 0;
    }
  }
}

export default FriendController;
