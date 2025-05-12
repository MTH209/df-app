// migrateToMongoDB.js - Script to migrate in-memory data to MongoDB
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { promises as fs } from 'fs';
import path from 'path';

// Import MongoDB models
import { 
  User, 
  Dragon, 
  Resource, 
  Quest, 
  Skin, 
  ShopItem, 
  Transaction, 
  Notification, 
  Friend, 
  DragonMerge, 
  initializeDatabase 
} from '../models/index.js';

// Import original models
import UserModel from '../models/UserModel.js';
import DragonModel from '../models/DragonModel.js';
import ResourceModel from '../models/ResourceModel.js';
import QuestModel from '../models/QuestModel.js';
import MailboxModel from '../models/MailboxModel.js';

// Import database connection
import database from '../configs/database.js';

dotenv.config();

async function migrateUsers(userModel) {
  console.log('Migrating users...');
  const users = userModel.users;
  
  for (const user of users) {
    // Convert in-memory user to MongoDB user
    const newUser = new User({
      telegramId: user.telegramId,
      username: user.username,
      password: user.password, // Note: In production, ensure passwords are properly hashed
      registrationDate: user.registeredAt,
      lastLogin: user.lastLogin || new Date(),
      isOnline: false,
      level: user.gameStats?.level || 1,
      experience: 0, // Default value
      ownedSkins: [],
      currentQuests: {
        daily: [],
        special: []
      },
      questHistory: []
    });
    
    try {
      await newUser.save();
      console.log(`✅ Migrated user: ${user.username}`);
    } catch (error) {
      console.error(`❌ Error migrating user ${user.username}:`, error.message);
    }
  }
}

async function migrateDragons(dragonModel) {
  console.log('Migrating dragons...');
  
  if (!dragonModel.dragons) {
    console.log('No dragons to migrate');
    return;
  }
  
  for (const dragon of dragonModel.dragons) {
    try {
      // Find the MongoDB user by telegramId
      const user = await User.findOne({ telegramId: dragon.userId });
      
      if (!user) {
        console.error(`❌ User not found for dragon: ${dragon.id}`);
        continue;
      }
      
      const newDragon = new Dragon({
        userId: user._id,
        name: dragon.name || `Dragon ${Math.floor(Math.random() * 1000)}`,
        level: dragon.level || 1,
        type: dragon.type || 'Basic',
        description: dragon.description || 'A loyal dragon companion',
        stats: {
          crystalRate: dragon.crystalRate || 0.1 * (dragon.level || 1),
          tokenRate: dragon.tokenRate || 0.05 * (dragon.level || 1)
        },
        lastCollection: dragon.lastCollection || new Date(),
        activeSkin: 'default'
      });
      
      await newDragon.save();
      console.log(`✅ Migrated dragon: ${newDragon.name} (Level ${newDragon.level})`);
    } catch (error) {
      console.error(`❌ Error migrating dragon:`, error.message);
    }
  }
}

async function migrateResources(resourceModel) {
  console.log('Migrating resources...');
  
  if (!resourceModel.resources) {
    console.log('No resources to migrate');
    return;
  }
  
  for (const resource of resourceModel.resources) {
    try {
      // Find the MongoDB user by telegramId
      const user = await User.findOne({ telegramId: resource.userId });
      
      if (!user) {
        console.error(`❌ User not found for resources: ${resource.userId}`);
        continue;
      }
      
      const newResource = new Resource({
        userId: user._id,
        crystals: resource.crystals || 0,
        tokens: resource.tokens || 0,
        realMoney: 0, // Start with zero
        lastUpdated: new Date()
      });
      
      await newResource.save();
      console.log(`✅ Migrated resources for user: ${user.username}`);
    } catch (error) {
      console.error(`❌ Error migrating resources:`, error.message);
    }
  }
}

async function migrateQuests(questModel) {
  console.log('Migrating user quests...');
  
  if (!questModel.userQuests) {
    console.log('No user quests to migrate');
    return;
  }
  
  // First ensure all quest templates are initialized
  await Quest.initializeQuestTemplates();
  
  for (const [userId, userQuests] of Object.entries(questModel.userQuests)) {
    try {
      // Find the MongoDB user by telegramId
      const user = await User.findOne({ telegramId: parseInt(userId) });
      
      if (!user) {
        console.error(`❌ User not found for quests: ${userId}`);
        continue;
      }
      
      // Map the old quest format to the new format
      if (userQuests.daily) {
        user.currentQuests.daily = userQuests.daily.map(q => ({
          questId: q.id,
          progress: q.progress || 0,
          completed: q.completed || false,
          claimed: q.claimed || false,
          expiresAt: new Date(new Date().setHours(23, 59, 59, 999)) // End of today
        }));
      }
      
      if (userQuests.special) {
        user.currentQuests.special = userQuests.special.map(q => ({
          questId: q.id,
          progress: q.progress || 0,
          completed: q.completed || false,
          claimed: q.claimed || false,
          expiresAt: null // Special quests don't expire
        }));
      }
      
      await user.save();
      console.log(`✅ Migrated quests for user: ${user.username}`);
    } catch (error) {
      console.error(`❌ Error migrating quests:`, error.message);
    }
  }
}

async function migrateMailbox(mailboxModel) {
  console.log('Migrating mailbox messages...');
  
  if (!mailboxModel.messages) {
    console.log('No mailbox messages to migrate');
    return;
  }
  
  for (const message of mailboxModel.messages) {
    try {
      // Find the MongoDB user by telegramId
      const user = await User.findOne({ telegramId: message.userId });
      
      if (!user) {
        console.error(`❌ User not found for message: ${message.id}`);
        continue;
      }
      
      const newNotification = new Notification({
        userId: user._id,
        title: message.title || 'System Notification',
        content: message.content,
        type: 'SYSTEM', // Default type
        read: message.read || false,
        relatedData: {},
        expiresAt: null // No expiration
      });
      
      await newNotification.save();
      console.log(`✅ Migrated message: ${newNotification.title}`);
    } catch (error) {
      console.error(`❌ Error migrating message:`, error.message);
    }
  }
}

async function updateDotEnv() {
  console.log('Updating .env file with MongoDB connection...');
  
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, create it
      envContent = '';
    }
    
    // Check if MONGODB_URI already exists
    if (!envContent.includes('MONGODB_URI=')) {
      // Add MongoDB URI to env file
      envContent += `\n# MongoDB Connection\nMONGODB_URI=mongodb://localhost:27017/dragonforge\n`;
      await fs.writeFile(envPath, envContent);
      console.log('✅ Added MongoDB URI to .env file');
    } else {
      console.log('MongoDB URI already exists in .env file');
    }
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
  }
}

async function main() {
  try {
    console.log('Starting migration to MongoDB...');
    
    // Connect to MongoDB
    await database.connect();
    console.log('Connected to MongoDB');
    
    // Update .env file
    await updateDotEnv();
    
    // Initialize models
    const userModel = new UserModel();
    const dragonModel = new DragonModel();
    const resourceModel = new ResourceModel();
    const questModel = new QuestModel();
    const mailboxModel = new MailboxModel();
    
    // Perform migrations
    await migrateUsers(userModel);
    await migrateDragons(dragonModel);
    await migrateResources(resourceModel);
    await migrateQuests(questModel);
    await migrateMailbox(mailboxModel);
    
    // Initialize database templates
    await initializeDatabase();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Disconnect from MongoDB
    await database.disconnect();
    process.exit(0);
  }
}

// Run the migration
main();
