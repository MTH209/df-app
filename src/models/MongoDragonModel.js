// MongoDragonModel.js - MongoDB schema and model for dragons
import mongoose from 'mongoose';

const dragonSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  level: { 
    type: Number, 
    default: 1,
    min: 1,
    max: 100
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Fire', 'Water', 'Earth', 'Air', 'Lightning', 'Ice', 'Shadow', 'Light', 'Basic']
  },
  description: { 
    type: String 
  },
  stats: {
    crystalRate: { 
      type: Number, 
      required: true,
      default: 0.1 // Base rate per second
    },
    tokenRate: { 
      type: Number, 
      required: true,
      default: 0.05 // Base rate per second
    }
  },
  lastCollection: { 
    type: Date,
    default: Date.now
  },
  activeSkin: { 
    type: String,
    default: 'default'
  }
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Calculate uncollected resources
dragonSchema.methods.calculateResources = function() {
  const now = new Date();
  const lastCollection = this.lastCollection || this.createdAt;
  const elapsedSeconds = Math.floor((now - lastCollection) / 1000);
  
  return {
    crystals: elapsedSeconds * this.stats.crystalRate,
    tokens: elapsedSeconds * this.stats.tokenRate,
    elapsedTime: elapsedSeconds
  };
};

// Collect resources
dragonSchema.methods.collectResources = function() {
  const resources = this.calculateResources();
  this.lastCollection = new Date();
  return resources;
};

// Level up a dragon (when merging two dragons)
dragonSchema.methods.levelUp = function() {
  this.level += 1;
  
  // Increase resource generation rates based on level
  const levelMultiplier = 1 + (this.level * 0.2); // 20% increase per level
  this.stats.crystalRate = 0.1 * levelMultiplier;
  this.stats.tokenRate = 0.05 * levelMultiplier;
  
  return this;
};

// Static method to find dragon by ID and user ID (for security)
dragonSchema.statics.findByIdAndUser = function(dragonId, userId) {
  return this.findOne({ _id: dragonId, userId });
};

// Static method to find all dragons for a user
dragonSchema.statics.findByUserId = function(userId) {
  return this.find({ userId });
};

const Dragon = mongoose.model('Dragon', dragonSchema);

export default Dragon;
