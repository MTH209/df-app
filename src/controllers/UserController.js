// UserController.js - Handles user authentication logic
import { User, Resource } from '../models/index.js';
import database from '../configs/database.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../middlewares/authMiddleware.js';

class UserController {
  constructor() {
    // Ensure database connection is established
    this.init();
  }
  
  // Initialize database connection
  async init() {
    try {
      await database.connect();
      console.log('UserController connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  // Register a new user
  async register(telegramId, username, password) {
    try {
      // Validate inputs
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }

      if (username.length < 3) {
        return {
          success: false,
          message: 'Username must be at least 3 characters'
        };
      }

      if (password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters'
        };
      }
      
      // Check if user with this telegramId already exists
      const existingUser = await User.findOne({ telegramId });
      if (existingUser) {
        return {
          success: false,
          message: 'User with this Telegram ID already exists'
        };
      }
      
      // Check if username is taken
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      // Create new user
      const newUser = new User({
        telegramId,
        username,
        password: hashedPassword,
        registrationDate: new Date(),
        lastLogin: new Date(),
        dailyLoginStreak: 1,
        lastDailyReward: new Date(),
        isOnline: true,
        level: 1,
        experience: 0,
        ownedSkins: [],
        currentQuests: {
          daily: [],
          special: []
        },
        questHistory: []
      });
      
      await newUser.save();
      
      // Initialize resources for the new user
      await Resource.findOrCreateByUserId(newUser._id);
      
      // Generate JWT token
      const token = generateToken(newUser);
      
      return {
        success: true,
        message: 'Registration successful',
        token,
        user: newUser.toPublicJSON()
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return {
        success: false,
        message: 'Registration failed: ' + error.message
      };
    }
  }

  // Login a user
  async login(username, password) {
    try {
      // Validate inputs
      if (!username || !password) {
        return {
          success: false,
          message: 'Username and password are required'
        };
      }
      
      // Find user by username
      const user = await User.findOne({ username });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid password'
        };
      }
      
      // Update last login
      user.lastLogin = new Date();
      user.isOnline = true;
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user);
      
      return {
        success: true,
        message: 'Login successful',
        token,
        user: user.toPublicJSON()
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return {
        success: false,
        message: 'Login failed: ' + error.message
      };
    }
  }

  // Check if user is already registered by Telegram ID
  async isUserRegistered(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      return !!user;
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  }

  // Get user by Telegram ID
  async getUserByTelegramId(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      return user ? user.toPublicJSON() : null;
    } catch (error) {
      console.error('Error getting user by Telegram ID:', error);
      return null;
    }
  }
  
  // Update user's experience and level
  async updateExperience(telegramId, experienceToAdd) {
    try {
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Add experience
      user.experience += experienceToAdd;
      
      // Check if level up
      const oldLevel = user.level;
      const newLevel = Math.floor(1 + Math.sqrt(user.experience / 100));
      
      let levelUp = false;
      if (newLevel > oldLevel) {
        user.level = newLevel;
        levelUp = true;
      }
      
      await user.save();
      
      return {
        success: true,
        levelUp,
        oldLevel,
        newLevel: user.level,
        experience: user.experience
      };
    } catch (error) {
      console.error('Error updating experience:', error);
      return {
        success: false,
        message: 'Failed to update experience: ' + error.message
      };
    }
  }
}

export default UserController;
