// index.js - Exports all MongoDB models
import User from './MongoUserModel.js';
import Dragon from './MongoDragonModel.js';
import Resource from './MongoResourceModel.js';
import Quest from './MongoQuestModel.js';
import Skin from './MongoSkinModel.js';
import ShopItem from './MongoShopItemModel.js';
import Transaction from './MongoTransactionModel.js';
import Notification from './MongoNotificationModel.js';
import Friend from './MongoFriendModel.js';
import DragonMerge from './MongoDragonMergeModel.js';

export {
  User,
  Dragon,
  Resource,
  Quest,
  Skin,
  ShopItem,
  Transaction,
  Notification,
  Friend,
  DragonMerge
};

// Initialize database data function
export const initializeDatabase = async () => {
  try {
    console.log('Initializing database data...');
    
    // Initialize quest templates
    await Quest.initializeQuestTemplates();
    console.log('Quests initialized');
    
    // Initialize skin templates
    await Skin.initializeSkinTemplates();
    console.log('Skins initialized');
    
    // Initialize shop item templates
    await ShopItem.initializeShopItemTemplates();
    console.log('Shop items initialized');
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};
