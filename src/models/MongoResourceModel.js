// MongoResourceModel.js - MongoDB schema and model for player resources
import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    unique: true
  },
  crystals: { 
    type: Number, 
    default: 0,
    min: 0
  },
  tokens: { 
    type: Number, 
    default: 0,
    min: 0
  },
  realMoney: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastUpdated: { 
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add crystals
resourceSchema.methods.addCrystals = function(amount) {
  this.crystals += amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Add tokens
resourceSchema.methods.addTokens = function(amount) {
  this.tokens += amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Add real money
resourceSchema.methods.addRealMoney = function(amount) {
  this.realMoney += amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Spend crystals
resourceSchema.methods.spendCrystals = function(amount) {
  if (this.crystals < amount) {
    throw new Error('Not enough crystals');
  }
  this.crystals -= amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Spend tokens
resourceSchema.methods.spendTokens = function(amount) {
  if (this.tokens < amount) {
    throw new Error('Not enough tokens');
  }
  this.tokens -= amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Spend real money
resourceSchema.methods.spendRealMoney = function(amount) {
  if (this.realMoney < amount) {
    throw new Error('Not enough real money');
  }
  this.realMoney -= amount;
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to find or create resource document for a user
resourceSchema.statics.findOrCreateByUserId = async function(userId) {
  let resource = await this.findOne({ userId });
  
  if (!resource) {
    resource = new this({
      userId,
      crystals: 100, // Starting crystals
      tokens: 50     // Starting tokens
    });
    await resource.save();
  }
  
  return resource;
};

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
