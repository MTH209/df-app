// UserRoutes.js - Routes for user operations
import express from 'express';
import UserController from '../controllers/UserController.js';

const router = express.Router();
const userController = new UserController();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { telegramId, username, password } = req.body;
    const result = await userController.register(telegramId, username, password);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in register route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { telegramId, password } = req.body;
    const result = await userController.login(telegramId, password);
    res.status(result.success ? 200 : 401).json(result);
  } catch (error) {
    console.error('Error in login route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user profile
router.get('/profile/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = await userController.getUserByTelegramId(telegramId);
    
    if (user) {
      // Remove sensitive fields
      const { password, ...userProfile } = user._doc;
      res.status(200).json({ success: true, user: userProfile });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error in get profile route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
router.put('/profile/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const updateData = req.body;
    
    // Don't allow password updates through this route for security
    if (updateData.password) {
      delete updateData.password;
    }
    
    const result = await userController.updateUser(telegramId, updateData);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in update profile route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    const { telegramId, currentPassword, newPassword } = req.body;
    const result = await userController.changePassword(telegramId, currentPassword, newPassword);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in change password route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search term must be at least 3 characters' 
      });
    }
    
    const users = await userController.searchUsers(username);
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error in search users route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update last active timestamp
router.post('/active/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await userController.updateLastActive(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in update last active route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
