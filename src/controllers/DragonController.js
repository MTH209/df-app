// DragonController.js - Handles dragon game logic
import { Dragon, Resource, User, DragonMerge, Transaction, Skin } from '../models/index.js';
import database from '../configs/database.js';

class DragonController {
  constructor() {
    // Ensure database connection is established
    this.init();
    this.userController = null; // Will be set later
  }
  
  // Initialize database connection
  async init() {
    try {
      await database.connect();
      console.log('DragonController connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }
  
  // Set the user controller reference
  setUserController(userController) {
    this.userController = userController;
  }

  // Initialize a new player with default dragon
  async initializePlayer(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Check if player already has dragons
      const existingDragons = await Dragon.find({ userId: user._id });
      
      if (existingDragons.length > 0) {
        return {
          success: false,
          message: 'Player already initialized',
          dragons: existingDragons
        };
      }
      
      // Create default dragon
      const defaultDragon = new Dragon({
        userId: user._id,
        name: 'Baby Dragon',
        level: 1,
        type: 'Basic',
        description: 'Your first dragon companion',
        stats: {
          crystalRate: 0.1,
          tokenRate: 0.05
        },
        lastCollection: new Date(),
        activeSkin: 'default'
      });
      
      await defaultDragon.save();
    
    // Initialize resources
    await Resource.findOrCreateByUserId(user._id);
    
    // Return success
    return {
      success: true,
      message: 'Player initialized with default dragon',
      dragon: defaultDragon
    };
  } catch (error) {
    console.error('Error initializing player:', error);
    return {
      success: false,
      message: 'Error initializing player: ' + error.message
    };
  }
}

  // Get player dragons
  async getPlayerDragons(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          count: 0,
          dragons: []
        };
      }
      
      const dragons = await Dragon.find({ userId: user._id });
      
      return {
        success: true,
        count: dragons.length,
        dragons: dragons
      };
    } catch (error) {
      console.error('Error getting player dragons:', error);
      return {
        success: false,
        message: 'Error getting player dragons: ' + error.message,
        count: 0,
        dragons: []
      };
    }
  }

  // Update and collect resources
  async collectResources(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get all user's dragons
      const dragons = await Dragon.find({ userId: user._id });
      
      if (dragons.length === 0) {
        return {
          success: false,
          message: 'No dragons found'
        };
      }
      
      // Get user resources
      let resources = await Resource.findOne({ userId: user._id });
      
      if (!resources) {
        resources = await Resource.findOrCreateByUserId(user._id);
      }
      
      let totalCrystals = 0;
      let totalTokens = 0;
      
      // Collect resources from each dragon
      for (const dragon of dragons) {
        const dragonResources = dragon.calculateResources();
        
        totalCrystals += dragonResources.crystals;
        totalTokens += dragonResources.tokens;
        
        // Update last collection time
        dragon.lastCollection = new Date();
        await dragon.save();
      }
      
      // Round resources
      totalCrystals = Math.floor(totalCrystals);
      totalTokens = Math.floor(totalTokens);
      
      // Update user resources
      await resources.addCrystals(totalCrystals);
      await resources.addTokens(totalTokens);
      
      return {
        success: true,
        message: `Collected ${totalCrystals} crystals and ${totalTokens} tokens`,
        collected: {
          crystals: totalCrystals,
          tokens: totalTokens
        },
        totalResources: {
          crystals: resources.crystals,
          tokens: resources.tokens
        }
      };
    } catch (error) {
      console.error('Error collecting resources:', error);
      return {
        success: false,
        message: 'Error collecting resources: ' + error.message
      };
    }
  }

  // Get player resources
  async getPlayerResources(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Collect any pending resources first
      await this.collectResources(userId);
      
      // Get user resources
      const resources = await Resource.findOne({ userId: user._id });
      
      if (!resources) {
        return {
          success: false,
          message: 'Resources not found'
        };
      }
      
      return {
        success: true,
        resources: {
          crystals: resources.crystals,
          tokens: resources.tokens,
          realMoney: resources.realMoney
        }
      };
    } catch (error) {
      console.error('Error getting player resources:', error);
      return {
        success: false,
        message: 'Error getting player resources: ' + error.message
      };
    }
  }

  // Merge two dragons to create a higher level dragon
  async mergeDragons(userId, dragonId1, dragonId2) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Find the dragons
      const dragon1 = await Dragon.findOne({ _id: dragonId1, userId: user._id });
      const dragon2 = await Dragon.findOne({ _id: dragonId2, userId: user._id });
      
      if (!dragon1 || !dragon2) {
        return {
          success: false,
          message: 'One or both dragons not found'
        };
      }
      
      // Check if dragons have the same level
      if (dragon1.level !== dragon2.level) {
        return {
          success: false,
          message: 'Dragons must be the same level to merge'
        };
      }
      
      // Create a new dragon with higher level
      const newDragon = new Dragon({
        userId: user._id,
        name: `Level ${dragon1.level + 1} Dragon`,
        level: dragon1.level + 1,
        type: dragon1.type,
        description: `A level ${dragon1.level + 1} dragon created by merging`,
        stats: {
          crystalRate: dragon1.stats.crystalRate * 1.2,
          tokenRate: dragon1.stats.tokenRate * 1.2
        },
        lastCollection: new Date(),
        activeSkin: 'default'
      });
      
      await newDragon.save();
      
      // Record the merge
      await DragonMerge.createMergeRecord({
        userId: user._id,
        dragonId1: dragon1._id,
        dragonId2: dragon2._id,
        resultDragonId: newDragon._id,
        levelBefore: dragon1.level,
        levelAfter: newDragon.level,
        stats: {
          oldCrystalRate1: dragon1.stats.crystalRate,
          oldTokenRate1: dragon1.stats.tokenRate,
          oldCrystalRate2: dragon2.stats.crystalRate,
          oldTokenRate2: dragon2.stats.tokenRate,
          newCrystalRate: newDragon.stats.crystalRate,
          newTokenRate: newDragon.stats.tokenRate
        }
      });
      
      // Delete the merged dragons
      await Dragon.deleteOne({ _id: dragon1._id });
      await Dragon.deleteOne({ _id: dragon2._id });
      
      return {
        success: true,
        message: `Dragons merged into a level ${newDragon.level} dragon`,
        newDragon
      };
    } catch (error) {
      console.error('Error merging dragons:', error);
      return {
        success: false,
        message: 'Error merging dragons: ' + error.message
      };
    }
  }

  // Purchase a dragon from the shop
  async purchaseDragon(userId, level, price) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get user resources
      const resources = await Resource.findOne({ userId: user._id });
      
      if (!resources) {
        return {
          success: false,
          message: 'User resources not found'
        };
      }
      
      // Check if user has enough crystals
      if (resources.crystals < price) {
        return {
          success: false,
          message: 'Not enough crystals'
        };
      }
      
      // Spend crystals
      await resources.spendCrystals(price);
      
      // Create new dragon
      const newDragon = new Dragon({
        userId: user._id,
        name: `Shop Dragon Level ${level}`,
        level: level,
        type: ['Fire', 'Water', 'Earth', 'Air'][Math.floor(Math.random() * 4)],
        description: `A level ${level} dragon purchased from the shop`,
        stats: {
          crystalRate: 0.1 * level * 1.2,
          tokenRate: 0.05 * level * 1.2
        },
        lastCollection: new Date(),
        activeSkin: 'default'
      });
      
      await newDragon.save();
      
      // Record the transaction
      await Transaction.createTransaction({
        userId: user._id,
        type: 'PURCHASE',
        amount: price,
        currency: 'CRYSTAL',
        itemId: `dragon_level_${level}`,
        status: 'COMPLETED',
        paymentMethod: 'INTERNAL',
        reference: Transaction.generateReferenceCode(),
        completedAt: new Date(),
        description: `Purchased Level ${level} Dragon`
      });
      
      return {
        success: true,
        message: `Successfully purchased a Level ${level} Dragon`,
        dragon: newDragon,
        remainingCrystals: resources.crystals
      };
    } catch (error) {
      console.error('Error purchasing dragon:', error);
      return {
        success: false,
        message: 'Error purchasing dragon: ' + error.message
      };
    }
  }

  // Rename a dragon
  async renameDragon(userId, dragonId, newName) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Find the dragon
      const dragon = await Dragon.findOne({ _id: dragonId, userId: user._id });
      
      if (!dragon) {
        return {
          success: false,
          message: 'Dragon not found'
        };
      }
      
      // Update the name
      dragon.name = newName;
      await dragon.save();
      
      return {
        success: true,
        message: 'Dragon renamed successfully',
        dragon
      };
    } catch (error) {
      console.error('Error renaming dragon:', error);
      return {
        success: false,
        message: 'Error renaming dragon: ' + error.message
      };
    }
  }

  // Purchase a skin
  async purchaseSkin(userId, skinId, price) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get user resources
      const resources = await Resource.findOne({ userId: user._id });
      
      if (!resources) {
        return {
          success: false,
          message: 'User resources not found'
        };
      }
      
      // Find the skin
      const skin = await Skin.findOne({ id: skinId });
      
      if (!skin) {
        return {
          success: false,
          message: 'Skin not found'
        };
      }
      
      // Check if user already owns this skin
      if (user.ownedSkins.includes(skinId)) {
        return {
          success: false,
          message: 'You already own this skin'
        };
      }
      
      // Check if user has enough real money
      if (resources.realMoney < price) {
        return {
          success: false,
          message: 'Not enough real money (xu)'
        };
      }
      
      // Spend real money
      await resources.spendRealMoney(price);
      
      // Add skin to user's owned skins
      user.ownedSkins.push(skinId);
      await user.save();
      
      // Record the transaction
      await Transaction.createTransaction({
        userId: user._id,
        type: 'PURCHASE',
        amount: price,
        currency: 'REAL_MONEY',
        itemId: skinId,
        status: 'COMPLETED',
        paymentMethod: 'INTERNAL',
        reference: Transaction.generateReferenceCode(),
        completedAt: new Date(),
        description: `Purchased ${skin.name} Skin`
      });
      
      return {
        success: true,
        message: `Successfully purchased ${skin.name} skin`,
        skin: skin,
        remainingRealMoney: resources.realMoney
      };
    } catch (error) {
      console.error('Error purchasing skin:', error);
      return {
        success: false,
        message: 'Error purchasing skin: ' + error.message
      };
    }
  }

  // Apply a skin to a dragon
  async applySkin(userId, dragonId, skinId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Check if user owns the skin
      if (!user.ownedSkins.includes(skinId)) {
        return {
          success: false,
          message: 'You do not own this skin'
        };
      }
      
      // Find the dragon
      const dragon = await Dragon.findOne({ _id: dragonId, userId: user._id });
      
      if (!dragon) {
        return {
          success: false,
          message: 'Dragon not found'
        };
      }
      
      // Apply the skin
      dragon.activeSkin = skinId;
      await dragon.save();
      
      return {
        success: true,
        message: `Skin applied to ${dragon.name}`,
        dragon
      };
    } catch (error) {
      console.error('Error applying skin:', error);
      return {
        success: false,
        message: 'Error applying skin: ' + error.message
      };
    }
  }

  // Calculate generation rates for all dragons
  async calculateGenerationRates(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      const dragons = await Dragon.find({ userId: user._id });
      
      let totalCrystalRate = 0;
      let totalTokenRate = 0;
      
      dragons.forEach(dragon => {
        totalCrystalRate += dragon.stats.crystalRate;
        totalTokenRate += dragon.stats.tokenRate;
      });
      
      return {
        success: true,
        rates: {
          crystalsPerSecond: totalCrystalRate,
          tokensPerSecond: totalTokenRate,
          crystalsPerMinute: totalCrystalRate * 60,
          tokensPerMinute: totalTokenRate * 60,
          crystalsPerHour: totalCrystalRate * 3600,
          tokensPerHour: totalTokenRate * 3600
        }
      };
    } catch (error) {
      console.error('Error calculating generation rates:', error);
      return {
        success: false,
        message: 'Error calculating generation rates: ' + error.message
      };
    }
  }

  // Create a new dragon using crystals
  async createNewDragon(userId, cost) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }
      
      // Get user resources
      const resources = await Resource.findOne({ userId: user._id });
      
      if (!resources) {
        return {
          success: false,
          message: 'User resources not found'
        };
      }
      
      // Check if user has enough crystals
      if (resources.crystals < cost) {
        return {
          success: false,
          message: 'Not enough crystals'
        };
      }
      
      // Spend crystals
      await resources.spendCrystals(cost);
      
      // Create new dragon
      const newDragon = new Dragon({
        userId: user._id,
        name: 'New Dragon',
        level: 1,
        type: ['Fire', 'Water', 'Earth', 'Air'][Math.floor(Math.random() * 4)],
        description: 'A newly created dragon',
        stats: {
          crystalRate: 0.1,
          tokenRate: 0.05
        },
        lastCollection: new Date(),
        activeSkin: 'default'
      });
      
      await newDragon.save();
      
      return {
        success: true,
        message: 'New dragon created successfully',
        dragon: newDragon,
        remainingCrystals: resources.crystals
      };
    } catch (error) {
      console.error('Error creating new dragon:', error);
      return {
        success: false,
        message: 'Error creating new dragon: ' + error.message
      };
    }
  }
  
  // Get token leaderboard
  async getTokenLeaderboard(limit = 10) {
    try {
      // Get resources sorted by tokens (descending)
      const resources = await Resource.find()
        .sort({ tokens: -1 })
        .limit(limit);
      
      // Create leaderboard with user details
      const leaderboard = [];
      
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        
        // Find user associated with this resource
        const user = await User.findOne({ _id: resource.userId });
        
        if (user) {
          leaderboard.push({
            rank: i + 1,
            userId: user.telegramId,
            username: user.username || 'Unknown Player',
            tokens: resource.tokens,
            lastUpdated: resource.lastUpdated || resource.updatedAt
          });
        }
      }
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting token leaderboard:', error);
      return [];
    }
  }
  
  // Get crystal leaderboard
  async getCrystalLeaderboard(limit = 10) {
    try {
      // Get resources sorted by crystals (descending)
      const resources = await Resource.find()
        .sort({ crystals: -1 })
        .limit(limit);
      
      // Create leaderboard with user details
      const leaderboard = [];
      
      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        
        // Find user associated with this resource
        const user = await User.findOne({ _id: resource.userId });
        
        if (user) {
          leaderboard.push({
            rank: i + 1,
            userId: user.telegramId,
            username: user.username || 'Unknown Player',
            crystals: resource.crystals,
            lastUpdated: resource.lastUpdated || resource.updatedAt
          });
        }
      }
      
      return leaderboard;
    } catch (error) {
      console.error('Error getting crystal leaderboard:', error);
      return [];
    }
  }
  
  // Get player's rank in token leaderboard
  async getPlayerTokenRank(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          rank: -1,
          total: 0,
          message: 'User not found'
        };
      }
      
      // Get resources sorted by tokens in descending order
      const resources = await Resource.find().sort({ tokens: -1 });
      
      // Find the index of user's resources
      const playerIndex = resources.findIndex(resource => 
        resource.userId.toString() === user._id.toString());
      
      if (playerIndex === -1) {
        return {
          rank: -1,
          total: resources.length,
          message: 'Player not found in leaderboard'
        };
      }
      
      // Get user's resources
      const userResources = resources[playerIndex];
      
      return {
        rank: playerIndex + 1,
        total: resources.length,
        tokens: userResources.tokens
      };
    } catch (error) {
      console.error('Error getting player token rank:', error);
      return {
        rank: -1,
        total: 0,
        message: 'Error: ' + error.message
      };
    }
  }
  
  // Get player's rank in crystal leaderboard
  async getPlayerCrystalRank(userId) {
    try {
      // Find the user by telegramId
      const user = await User.findOne({ telegramId: userId });
      
      if (!user) {
        return {
          rank: -1,
          total: 0,
          message: 'User not found'
        };
      }
      
      // Get resources sorted by crystals in descending order
      const resources = await Resource.find().sort({ crystals: -1 });
      
      // Find the index of user's resources
      const playerIndex = resources.findIndex(resource => 
        resource.userId.toString() === user._id.toString());
      
      if (playerIndex === -1) {
        return {
          rank: -1,
          total: resources.length,
          message: 'Player not found in leaderboard'
        };
      }
      
      // Get user's resources
      const userResources = resources[playerIndex];
      
      return {
        rank: playerIndex + 1,
        total: resources.length,
        crystals: userResources.crystals
      };
    } catch (error) {
      console.error('Error getting player crystal rank:', error);
      return {
        rank: -1,
        total: 0,
        message: 'Error: ' + error.message
      };
    }
  }
}

export default DragonController;
