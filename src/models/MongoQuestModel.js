// MongoQuestModel.js - MongoDB schema and model for quests
import mongoose from 'mongoose';

const questSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true,
    unique: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['DAILY', 'SPECIAL']
  },
  title: { 
    type: String, 
    required: true
  },
  description: { 
    type: String, 
    required: true 
  },
  objective: {
    type: { 
      type: String, 
      required: true,
      enum: [
        'LOGIN', 
        'COLLECT_CRYSTALS', 
        'COLLECT_TOKENS', 
        'UPGRADE_DRAGON', 
        'SHARE_GAME',
        'ADD_TO_HOMESCREEN',
        'DRAGON_LEVEL_UP',
        'TOTAL_DRAGONCOIN',
        'SUBSCRIBE_CHANNELS'
      ]
    },
    target: { 
      type: Number, 
      required: true,
      min: 1
    }
  },
  reward: {
    crystals: { 
      type: Number, 
      default: 0 
    },
    tokens: { 
      type: Number, 
      default: 0 
    },
    experience: { 
      type: Number, 
      default: 0 
    }
  },
  difficulty: { 
    type: String, 
    enum: ['EASY', 'MEDIUM', 'HARD'],
    default: 'EASY'
  },
  autoComplete: { 
    type: Boolean, 
    default: false 
  },
  expiresIn: { 
    type: Number, 
    default: null // Number of days until expiration, null for non-expiring quests
  }
}, {
  timestamps: true
});

// Static method to get all daily quests
questSchema.statics.getDailyQuests = function() {
  return this.find({ type: 'DAILY' });
};

// Static method to get all special quests
questSchema.statics.getSpecialQuests = function() {
  return this.find({ type: 'SPECIAL' });
};

// Static method to find a quest by ID
questSchema.statics.findQuestById = function(id) {
  return this.findOne({ id });
};

// Method to calculate time until reset (for daily quests)
questSchema.methods.getTimeUntilReset = function() {
  if (this.type !== 'DAILY') {
    return null;
  }
  
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const timeLeft = endOfDay - now;
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    milliseconds: timeLeft,
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`
  };
};

// Initialize quest templates
questSchema.statics.initializeQuestTemplates = async function() {
  const dailyQuests = [
    {
      id: 'daily_login',
      type: 'DAILY',
      title: 'Đăng nhập hàng ngày',
      description: 'Đăng nhập vào game',
      objective: {
        type: 'LOGIN',
        target: 1
      },
      reward: {
        crystals: 20,
        tokens: 20,
        experience: 10
      },
      difficulty: 'EASY',
      autoComplete: true
    },
    {
      id: 'daily_collect_crystals',
      type: 'DAILY',
      title: 'Nhận tinh thể rồng',
      description: 'Thu thập 100 tinh thể rồng',
      objective: {
        type: 'COLLECT_CRYSTALS',
        target: 100
      },
      reward: {
        crystals: 50,
        tokens: 30,
        experience: 15
      },
      difficulty: 'EASY',
      autoComplete: false
    },
    {
      id: 'daily_collect_tokens',
      type: 'DAILY',
      title: 'Nhận thưởng DragonCoin',
      description: 'Thu thập 50 DragonCoin',
      objective: {
        type: 'COLLECT_TOKENS',
        target: 50
      },
      reward: {
        crystals: 30,
        tokens: 50,
        experience: 15
      },
      difficulty: 'EASY',
      autoComplete: false
    },
    {
      id: 'daily_share_game',
      type: 'DAILY',
      title: 'Chia sẻ DragonForge',
      description: 'Chia sẻ game với bạn bè',
      objective: {
        type: 'SHARE_GAME',
        target: 1
      },
      reward: {
        crystals: 30,
        tokens: 30,
        experience: 20
      },
      difficulty: 'MEDIUM',
      autoComplete: false
    },
    {
      id: 'daily_upgrade_dragon',
      type: 'DAILY',
      title: 'Nâng cấp rồng',
      description: 'Nâng cấp hoặc ghép rồng',
      objective: {
        type: 'UPGRADE_DRAGON',
        target: 1
      },
      reward: {
        crystals: 50,
        tokens: 50,
        experience: 25
      },
      difficulty: 'MEDIUM',
      autoComplete: false
    }
  ];

  const specialQuests = [
    {
      id: 'special_add_to_homescreen',
      type: 'SPECIAL',
      title: 'Thêm DragonForge vào màn hình chính',
      description: 'Thêm DragonForge vào màn hình chính của điện thoại',
      objective: {
        type: 'ADD_TO_HOMESCREEN',
        target: 1
      },
      reward: {
        crystals: 100,
        tokens: 100,
        experience: 50
      },
      difficulty: 'EASY',
      autoComplete: false
    },
    {
      id: 'special_dragon_level_5',
      type: 'SPECIAL',
      title: 'Rồng cấp 5',
      description: 'Có một rồng đạt cấp 5',
      objective: {
        type: 'DRAGON_LEVEL_UP',
        target: 5
      },
      reward: {
        crystals: 200,
        tokens: 200,
        experience: 100
      },
      difficulty: 'MEDIUM',
      autoComplete: false
    },
    {
      id: 'special_dragon_level_10',
      type: 'SPECIAL',
      title: 'Rồng cấp 10',
      description: 'Có một rồng đạt cấp 10',
      objective: {
        type: 'DRAGON_LEVEL_UP',
        target: 10
      },
      reward: {
        crystals: 500,
        tokens: 500,
        experience: 250
      },
      difficulty: 'HARD',
      autoComplete: false
    },
    {
      id: 'special_dragoncoin_1000',
      type: 'SPECIAL',
      title: 'Nhà giàu DragonCoin',
      description: 'Tích lũy 1000 DragonCoin',
      objective: {
        type: 'TOTAL_DRAGONCOIN',
        target: 1000
      },
      reward: {
        crystals: 300,
        tokens: 300,
        experience: 150
      },
      difficulty: 'MEDIUM',
      autoComplete: false
    },
    {
      id: 'special_subscribe_channels',
      type: 'SPECIAL',
      title: 'Đăng ký trang liên quan',
      description: 'Đăng ký các kênh chính thức của DragonForge',
      objective: {
        type: 'SUBSCRIBE_CHANNELS',
        target: 1
      },
      reward: {
        crystals: 150,
        tokens: 150,
        experience: 75
      },
      difficulty: 'EASY',
      autoComplete: false
    }
  ];

  // Create all templates if they don't exist
  const allTemplates = [...dailyQuests, ...specialQuests];
  
  for (const template of allTemplates) {
    await this.findOneAndUpdate(
      { id: template.id },
      template,
      { upsert: true, new: true }
    );
  }
  
  console.log('Quest templates initialized');
};

const Quest = mongoose.model('Quest', questSchema);

export default Quest;
