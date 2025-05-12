// MongoUserModel.js - MongoDB schema and model for users
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  telegramId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  registrationDate: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  },
  dailyLoginStreak: { 
    type: Number, 
    default: 0 
  },
  lastDailyReward: { 
    type: Date 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  level: { 
    type: Number, 
    default: 1 
  },
  experience: { 
    type: Number, 
    default: 0 
  },
  ownedSkins: [{ 
    type: String 
  }],
  currentQuests: {
    daily: [{
      questId: String,
      progress: Number,
      completed: { type: Boolean, default: false },
      claimed: { type: Boolean, default: false },
      expiresAt: Date
    }],
    special: [{
      questId: String,
      progress: Number,
      completed: { type: Boolean, default: false },
      claimed: { type: Boolean, default: false },
      expiresAt: Date
    }]
  },
  questHistory: [{
    questId: String,
    completedAt: Date,
    reward: {
      crystals: Number,
      tokens: Number,
      experience: Number
    }
  }],
  gameStats: {
    points: { type: Number, default: 0 }
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Method to create a simple user object without sensitive data
userSchema.methods.toPublicJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find user by telegramId
userSchema.statics.findByTelegramId = function(telegramId) {
  return this.findOne({ telegramId });
};

// Static method to find user by username
userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

const User = mongoose.model('User', userSchema);

export default User;
