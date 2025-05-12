// FriendRoutes.js - Routes for friend operations
import express from 'express';
import FriendController from '../controllers/FriendController.js';

const router = express.Router();
const friendController = new FriendController();

// Send friend request
router.post('/request/:senderTelegramId', async (req, res) => {
  try {
    const { senderTelegramId } = req.params;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username is required' 
      });
    }
    
    const result = await friendController.sendFriendRequest(senderTelegramId, username);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in send friend request route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Accept friend request
router.post('/accept/:receiverTelegramId/:senderTelegramId', async (req, res) => {
  try {
    const { receiverTelegramId, senderTelegramId } = req.params;
    const result = await friendController.acceptFriendRequest(receiverTelegramId, senderTelegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in accept friend request route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject friend request
router.post('/reject/:receiverTelegramId/:senderTelegramId', async (req, res) => {
  try {
    const { receiverTelegramId, senderTelegramId } = req.params;
    const result = await friendController.rejectFriendRequest(receiverTelegramId, senderTelegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in reject friend request route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove friend
router.delete('/:userTelegramId/:friendTelegramId', async (req, res) => {
  try {
    const { userTelegramId, friendTelegramId } = req.params;
    const result = await friendController.removeFriend(userTelegramId, friendTelegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in remove friend route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get friends list
router.get('/list/:userTelegramId', async (req, res) => {
  try {
    const { userTelegramId } = req.params;
    const result = await friendController.getFriendsList(userTelegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get friends list route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get friend requests
router.get('/requests/:userTelegramId', async (req, res) => {
  try {
    const { userTelegramId } = req.params;
    const result = await friendController.getFriendRequests(userTelegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get friend requests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if users are friends
router.get('/check/:userTelegramId1/:userTelegramId2', async (req, res) => {
  try {
    const { userTelegramId1, userTelegramId2 } = req.params;
    const areFriends = await friendController.areFriends(userTelegramId1, userTelegramId2);
    res.status(200).json({ success: true, areFriends });
  } catch (error) {
    console.error('Error in check friends route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get friend count
router.get('/count/:userTelegramId', async (req, res) => {
  try {
    const { userTelegramId } = req.params;
    const count = await friendController.getFriendCount(userTelegramId);
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error in get friend count route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get friend request count
router.get('/requests/count/:userTelegramId', async (req, res) => {
  try {
    const { userTelegramId } = req.params;
    const count = await friendController.getFriendRequestCount(userTelegramId);
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error in get friend request count route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
