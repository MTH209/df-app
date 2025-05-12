// MongoDragonMergeModel.js - MongoDB schema and model for dragon merges
import mongoose from 'mongoose';

const dragonMergeSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  dragonId1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dragon',
    required: true
  },
  dragonId2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dragon',
    required: true
  },
  resultDragonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Dragon',
    required: true
  },
  levelBefore: { 
    type: Number, 
    required: true 
  },
  levelAfter: { 
    type: Number, 
    required: true 
  },
  stats: {
    oldCrystalRate1: Number,
    oldTokenRate1: Number,
    oldCrystalRate2: Number,
    oldTokenRate2: Number,
    newCrystalRate: Number,
    newTokenRate: Number
  }
}, {
  timestamps: true
});

// Static method to create a new merge record
dragonMergeSchema.statics.createMergeRecord = async function(data) {
  const mergeRecord = new this(data);
  await mergeRecord.save();
  return mergeRecord;
};

// Static method to find merges by user ID
dragonMergeSchema.statics.findByUserId = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('resultDragonId', 'name level type');
};

// Static method to get merge statistics for a user
dragonMergeSchema.statics.getMergeStatsByUserId = async function(userId) {
  const merges = await this.find({ userId });
  
  const totalMerges = merges.length;
  const highestLevelCreated = merges.reduce((max, merge) => 
    Math.max(max, merge.levelAfter), 0);
  
  const levelCounts = {};
  merges.forEach(merge => {
    levelCounts[merge.levelAfter] = (levelCounts[merge.levelAfter] || 0) + 1;
  });
  
  return {
    totalMerges,
    highestLevelCreated,
    levelCounts
  };
};

const DragonMerge = mongoose.model('DragonMerge', dragonMergeSchema);

export default DragonMerge;
