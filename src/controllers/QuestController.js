// QuestController.js - Handles quest logic and interactions
import { User, Quest, Resource, Dragon } from '../models/index.js';
import database from '../configs/database.js';

class QuestController {
  constructor(dragonController, resourceModel) {
    // Store controllers for reference
    this.dragonController = dragonController;
    this.resourceModel = resourceModel;
    this.userController = null; // Will be set later
    
    // Ensure database connection is established
    this.init();
  }
  
  // Initialize database connection
  async init() {
    try {
      await database.connect();
      console.log('QuestController connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  // Set user controller reference
  setUserController(userController) {
    this.userController = userController;
  }

  // Initialize a player's quests
  async initializePlayerQuests(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get all available quest templates
      const dailyQuests = await Quest.getDailyQuests();
      const specialQuests = await Quest.getSpecialQuests();
      
      // Add daily quests to user
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setHours(23, 59, 59, 999);
      
      user.currentQuests.daily = dailyQuests.map(quest => ({
        questId: quest.id,
        progress: 0,
        completed: false,
        claimed: false,
        expiresAt: tomorrow
      }));
      
      // Add special quests to user
      user.currentQuests.special = specialQuests.map(quest => ({
        questId: quest.id,
        progress: 0,
        completed: false,
        claimed: false,
        expiresAt: null // Special quests don't expire
      }));
      
      await user.save();
      
      return {
        success: true,
        message: 'Player quests initialized',
        dailyQuests: user.currentQuests.daily.length,
        specialQuests: user.currentQuests.special.length
      };
    } catch (error) {
      console.error('Error initializing player quests:', error);
      return {
        success: false,
        message: 'Error initializing player quests: ' + error.message
      };
    }
  }

  // Check if daily quests need to be reset and reset if needed
  async checkAndResetDailyQuests(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      const now = new Date();
      let resetNeeded = false;
      
      // Check if daily quests have expired
      if (user.currentQuests.daily.length > 0) {
        // Check the first quest's expiry (all daily quests expire at the same time)
        const firstQuest = user.currentQuests.daily[0];
        
        if (firstQuest.expiresAt && firstQuest.expiresAt < now) {
          resetNeeded = true;
        }
      } else {
        // No daily quests, need to initialize
        resetNeeded = true;
      }
      
      if (resetNeeded) {
        // Get all available daily quest templates
        const dailyQuests = await Quest.getDailyQuests();
        
        // Set expiry to end of today
        const tomorrow = new Date(now);
        tomorrow.setHours(23, 59, 59, 999);
        
        // Reset daily quests
        user.currentQuests.daily = dailyQuests.map(quest => ({
          questId: quest.id,
          progress: 0,
          completed: false,
          claimed: false,
          expiresAt: tomorrow
        }));
        
        await user.save();
        
        return {
          success: true,
          message: 'Daily quests have been reset',
          resetPerformed: true
        };
      }
      
      return {
        success: true,
        message: 'Daily quests are still valid',
        resetPerformed: false
      };
    } catch (error) {
      console.error('Error checking daily quests:', error);
      return {
        success: false,
        message: 'Error checking daily quests: ' + error.message
      };
    }
  }

  // Get all active quests for a player
  async getActiveQuests(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return [];
      }
      
      // Combine daily and special quests
      const userQuests = [...user.currentQuests.daily, ...user.currentQuests.special];
      
      // Fetch quest details from templates
      const questDetails = [];
      
      for (const userQuest of userQuests) {
        const questTemplate = await Quest.findOne({ id: userQuest.questId });
        
        if (questTemplate) {
          questDetails.push({
            id: questTemplate.id,
            type: questTemplate.type,
            title: questTemplate.title,
            description: questTemplate.description,
            objective: questTemplate.objective,
            reward: questTemplate.reward,
            difficulty: questTemplate.difficulty,
            progress: userQuest.progress,
            completed: userQuest.completed,
            claimed: userQuest.claimed,
            expiresAt: userQuest.expiresAt
          });
        }
      }
      
      return questDetails;
    } catch (error) {
      console.error('Error getting active quests:', error);
      return [];
    }
  }

  // Get daily quests specifically
  async getDailyQuests(userId) {
    try {
      const allQuests = await this.getActiveQuests(userId);
      return allQuests.filter(quest => quest.type === 'DAILY');
    } catch (error) {
      console.error('Error getting daily quests:', error);
      return [];
    }
  }
  
  // Get special quests specifically
  async getSpecialQuests(userId) {
    try {
      const allQuests = await this.getActiveQuests(userId);
      return allQuests.filter(quest => quest.type === 'SPECIAL');
    } catch (error) {
      console.error('Error getting special quests:', error);
      return [];
    }
  }

  // Get completed quests
  async getCompletedQuests(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return [];
      }
      
      // Get all active quests
      const activeQuests = await this.getActiveQuests(userId);
      
      // Filter for completed ones
      return activeQuests.filter(quest => quest.completed);
    } catch (error) {
      console.error('Error getting completed quests:', error);
      return [];
    }
  }

  // Get player quest stats
  async getQuestStats(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          totalQuests: 0,
          completedQuests: 0,
          claimedQuests: 0,
          pendingQuests: 0,
          completionRate: 0
        };
      }
      
      // Count quests in different states
      const dailyAndSpecial = [...user.currentQuests.daily, ...user.currentQuests.special];
      const totalQuests = dailyAndSpecial.length;
      const completedQuests = dailyAndSpecial.filter(q => q.completed).length;
      const claimedQuests = dailyAndSpecial.filter(q => q.claimed).length;
      const pendingQuests = totalQuests - completedQuests;
      const completionRate = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
      
      // Count total completed quests in history
      const historyCount = user.questHistory ? user.questHistory.length : 0;
      
      return {
        totalQuests,
        completedQuests,
        claimedQuests,
        pendingQuests,
        completionRate: Math.round(completionRate),
        totalCompletedEver: historyCount + claimedQuests
      };
    } catch (error) {
      console.error('Error getting quest stats:', error);
      return {
        totalQuests: 0,
        completedQuests: 0,
        claimedQuests: 0,
        pendingQuests: 0,
        completionRate: 0,
        totalCompletedEver: 0
      };
    }
  }

  // Update quest progress for a specific objective type
  async updateQuestProgress(userId, objectiveType, amount = 1) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return [];
      }
      
      let updated = false;
      const completedQuests = [];
      
      // Check and update daily quests
      for (const quest of user.currentQuests.daily) {
        // Get quest template to check objective type
        const questTemplate = await Quest.findOne({ id: quest.questId });
        
        if (questTemplate && questTemplate.objective.type === objectiveType && !quest.completed) {
          // Update progress
          quest.progress += amount;
          
          // Check if completed
          if (quest.progress >= questTemplate.objective.target) {
            quest.progress = questTemplate.objective.target; // Cap at target
            quest.completed = true;
            
            // Add to completed quests list
            completedQuests.push({
              id: questTemplate.id,
              type: questTemplate.type,
              title: questTemplate.title,
              description: questTemplate.description,
              objective: questTemplate.objective,
              reward: questTemplate.reward,
              difficulty: questTemplate.difficulty,
              progress: quest.progress,
              completed: true,
              claimed: false,
              expiresAt: quest.expiresAt
            });
          }
          
          updated = true;
        }
      }
      
      // Same for special quests
      for (const quest of user.currentQuests.special) {
        // Get quest template to check objective type
        const questTemplate = await Quest.findOne({ id: quest.questId });
        
        if (questTemplate && questTemplate.objective.type === objectiveType && !quest.completed) {
          // Update progress
          quest.progress += amount;
          
          // Check if completed
          if (quest.progress >= questTemplate.objective.target) {
            quest.progress = questTemplate.objective.target; // Cap at target
            quest.completed = true;
            
            // Add to completed quests list
            completedQuests.push({
              id: questTemplate.id,
              type: questTemplate.type,
              title: questTemplate.title,
              description: questTemplate.description,
              objective: questTemplate.objective,
              reward: questTemplate.reward,
              difficulty: questTemplate.difficulty,
              progress: quest.progress,
              completed: true,
              claimed: false,
              expiresAt: quest.expiresAt
            });
          }
          
          updated = true;
        }
      }
      
      // Save if any quests were updated
      if (updated) {
        await user.save();
      }
      
      return completedQuests;
    } catch (error) {
      console.error('Error updating quest progress:', error);
      return [];
    }
  }

  // Claim a quest reward
  async claimQuestReward(userId, questId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Look for the quest in user's daily and special quests
      let questToUpdate = null;
      let questType = null;
      
      // Check daily quests
      const dailyQuestIndex = user.currentQuests.daily.findIndex(q => q.questId === questId);
      if (dailyQuestIndex !== -1) {
        questToUpdate = user.currentQuests.daily[dailyQuestIndex];
        questType = 'daily';
      }
      
      // Check special quests if not found in daily
      if (!questToUpdate) {
        const specialQuestIndex = user.currentQuests.special.findIndex(q => q.questId === questId);
        if (specialQuestIndex !== -1) {
          questToUpdate = user.currentQuests.special[specialQuestIndex];
          questType = 'special';
        }
      }
      
      // If quest not found or not completed or already claimed
      if (!questToUpdate) {
        return {
          success: false,
          message: 'Quest not found'
        };
      }
      
      if (!questToUpdate.completed) {
        return {
          success: false,
          message: 'Quest not completed yet'
        };
      }
      
      if (questToUpdate.claimed) {
        return {
          success: false,
          message: 'Quest reward already claimed'
        };
      }
      
      // Get quest template for rewards
      const questTemplate = await Quest.findOne({ id: questId });
      
      if (!questTemplate) {
        return {
          success: false,
          message: 'Quest template not found'
        };
      }
      
      // Mark quest as claimed
      questToUpdate.claimed = true;
      
      // Add to quest history
      user.questHistory.push({
        questId: questId,
        completedAt: new Date(),
        reward: questTemplate.reward
      });
      
      await user.save();
      
      // Get user resources
      const userResources = await Resource.findOne({ userId: user._id });
      
      if (userResources) {
        // Add rewards to player resources
        const { crystals, tokens } = questTemplate.reward;
        
        if (crystals > 0) {
          await userResources.addCrystals(crystals);
        }
        
        if (tokens > 0) {
          await userResources.addTokens(tokens);
        }
      }
      
      // Add experience to user
      if (questTemplate.reward.experience > 0 && this.userController) {
        await this.userController.updateExperience(userId, questTemplate.reward.experience);
      }
      
      return {
        success: true,
        message: 'Quest reward claimed',
        rewards: questTemplate.reward
      };
    } catch (error) {
      console.error('Error claiming quest reward:', error);
      return {
        success: false,
        message: 'Error claiming quest reward: ' + error.message
      };
    }
  }

  // Handle player login - update streak and quest progress
  async handlePlayerLogin(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          streak: 0,
          completedQuests: []
        };
      }
      
      // Check if last login was today
      const now = new Date();
      const lastLogin = user.lastLogin || new Date(0);
      
      // Reset time parts to compare dates only
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      
      // If last login was before today, update login streak
      let streak = user.dailyLoginStreak || 0;
      
      if (nowDate > lastLoginDate) {
        // Check if consecutive day (yesterday)
        const yesterday = new Date(nowDate);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        
        if (lastLoginDate.getTime() === yesterdayDate.getTime()) {
          // Consecutive login
          streak += 1;
        } else {
          // Streak broken
          streak = 1;
        }
        
        // Update user
        user.dailyLoginStreak = streak;
        user.lastLogin = now;
        user.lastDailyReward = now;
        
        // Also update quest progress for LOGIN objective
        await this.updateQuestProgress(userId, 'LOGIN');
      } else {
        // Already logged in today
        streak = user.dailyLoginStreak;
      }
      
      await user.save();
      
      // Check for newly completed quests
      const completedQuests = await this.getCompletedUnclaimedQuests(userId);
      
      return {
        success: true,
        streak,
        completedQuests
      };
    } catch (error) {
      console.error('Error handling player login:', error);
      return {
        success: false,
        message: 'Error handling player login: ' + error.message,
        streak: 0,
        completedQuests: []
      };
    }
  }

  // Handle resource collection quest progress
  async handleResourceCollection(userId, crystals, tokens) {
    try {
      const completedQuests = [];
      
      if (crystals > 0) {
        const crystalQuests = await this.updateQuestProgress(userId, 'COLLECT_CRYSTALS', crystals);
        completedQuests.push(...crystalQuests);
        
        // Also update total crystal collection quests
        const totalCrystalQuests = await this.updateQuestProgress(userId, 'TOTAL_CRYSTALS', crystals);
        completedQuests.push(...totalCrystalQuests);
      }
      
      if (tokens > 0) {
        const tokenQuests = await this.updateQuestProgress(userId, 'COLLECT_TOKENS', tokens);
        completedQuests.push(...tokenQuests);
        
        // Also update total token collection quests
        const totalTokenQuests = await this.updateQuestProgress(userId, 'TOTAL_DRAGONCOIN', tokens);
        completedQuests.push(...totalTokenQuests);
      }
      
      return completedQuests;
    } catch (error) {
      console.error('Error handling resource collection:', error);
      return [];
    }
  }

  // Handle friend related quest progress
  async handleFriendAdded(userId) {
    try {
      // Update add friend quest
      const addFriendQuests = await this.updateQuestProgress(userId, 'ADD_FRIEND');
      
      // Check friend count for friend count quests
      const friendCount = this.userController?.getFriendCount?.(userId) || 0;
      
      // Get active friend count quests
      const user = await User.findOne({ telegramId: userId });
      if (!user) return addFriendQuests;
      
      let updated = false;
      const completedQuests = [...addFriendQuests];
      
      // Process daily quests
      for (const quest of user.currentQuests.daily) {
        const questTemplate = await Quest.findOne({ id: quest.questId });
        
        if (questTemplate && 
            questTemplate.objective.type === 'FRIEND_COUNT' && 
            !quest.completed && 
            questTemplate.objective.target <= friendCount) {
          
          quest.progress = friendCount;
          quest.completed = true;
          updated = true;
          
          completedQuests.push({
            id: questTemplate.id,
            type: questTemplate.type,
            title: questTemplate.title,
            description: questTemplate.description,
            objective: questTemplate.objective,
            reward: questTemplate.reward,
            difficulty: questTemplate.difficulty,
            progress: quest.progress,
            completed: true,
            claimed: false,
            expiresAt: quest.expiresAt
          });
        }
      }
      
      // Same for special quests
      for (const quest of user.currentQuests.special) {
        const questTemplate = await Quest.findOne({ id: quest.questId });
        
        if (questTemplate && 
            questTemplate.objective.type === 'FRIEND_COUNT' && 
            !quest.completed && 
            questTemplate.objective.target <= friendCount) {
          
          quest.progress = friendCount;
          quest.completed = true;
          updated = true;
          
          completedQuests.push({
            id: questTemplate.id,
            type: questTemplate.type,
            title: questTemplate.title,
            description: questTemplate.description,
            objective: questTemplate.objective,
            reward: questTemplate.reward,
            difficulty: questTemplate.difficulty,
            progress: quest.progress,
            completed: true,
            claimed: false,
            expiresAt: quest.expiresAt
          });
        }
      }
      
      if (updated) {
        await user.save();
      }
      
      return completedQuests;
    } catch (error) {
      console.error('Error handling friend added:', error);
      return [];
    }
  }
    
  
  // Handle game sharing quest progress
  async handleGameShared(userId) {
    try {
      return await this.updateQuestProgress(userId, 'SHARE_GAME');
    } catch (error) {
      console.error('Error handling game shared:', error);
      return [];
    }
  }

  // Handle add to homescreen quest progress
  async handleAddToHomescreen(userId) {
    try {
      return await this.updateQuestProgress(userId, 'ADD_TO_HOMESCREEN');
    } catch (error) {
      console.error('Error handling add to homescreen:', error);
      return [];
    }
  }

  // Handle subscribe to channels quest progress
  async handleChannelSubscribe(userId) {
    try {
      return await this.updateQuestProgress(userId, 'SUBSCRIBE_CHANNELS');
    } catch (error) {
      console.error('Error handling channel subscribe:', error);
      return [];
    }
  }
  
  // Get quests that are completed but rewards not claimed yet
  async getCompletedUnclaimedQuests(userId) {
    try {
      const quests = await this.getActiveQuests(userId);
      return quests.filter(quest => quest.completed && !quest.claimed);
    } catch (error) {
      console.error('Error getting completed unclaimed quests:', error);
      return [];
    }
  }

  // Calculate time until daily quest reset
  async getTimeUntilDailyReset(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return null;
      }
      
      // Check if there are daily quests
      if (user.currentQuests.daily.length === 0) {
        return null;
      }
      
      // Get the first daily quest's expiry time (all expire at the same time)
      const expiresAt = user.currentQuests.daily[0].expiresAt;
      
      if (!expiresAt) {
        return null;
      }
      
      // Calculate time remaining
      const now = new Date();
      const timeLeft = expiresAt - now;
      
      if (timeLeft <= 0) {
        return {
          milliseconds: 0,
          hours: 0,
          minutes: 0,
          formatted: '0h 0m'
        };
      }
      
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        milliseconds: timeLeft,
        hours,
        minutes,
        formatted: `${hours}h ${minutes}m`
      };
    } catch (error) {
      console.error('Error getting time until daily reset:', error);
      return null;
    }
  }

// ...
  // Handle dragon upgrade quest progress
  async handleDragonUpgrade(userId) {
    try {
      return await this.updateQuestProgress(userId, 'UPGRADE_DRAGON');
    } catch (error) {
      console.error('Error handling dragon upgrade:', error);
      return [];
    }
    const resetTime = new Date(lastReset);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(this.questModel.dailyQuestResetHour, 0, 0, 0);
    
    // Calculate milliseconds until reset
    const timeUntilReset = resetTime - now;
    
    // Convert to hours, minutes, seconds
    const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);
    
    return {
      hours,
      minutes,
      seconds,
      milliseconds: timeUntilReset,
      formatted: `${hours}h ${minutes}m ${seconds}s`
    };
  }
}

export default QuestController;
