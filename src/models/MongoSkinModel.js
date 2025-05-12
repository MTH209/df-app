// MongoSkinModel.js - MongoDB schema and model for dragon skins
import mongoose from 'mongoose';

const skinSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true,
    unique: true
  },
  name: { 
    type: String, 
    required: true
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  imageUrl: { 
    type: String 
  },
  rarity: { 
    type: String, 
    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    default: 'COMMON'
  },
  availability: {
    isAvailable: { 
      type: Boolean, 
      default: true 
    },
    startDate: { 
      type: Date,
      default: Date.now
    },
    endDate: { 
      type: Date,
      default: null // null means available forever
    }
  },
  dragonTypes: [{ 
    type: String,
    enum: ['Fire', 'Water', 'Earth', 'Air', 'Lightning', 'Ice', 'Shadow', 'Light', 'Basic', 'All']
  }]
}, {
  timestamps: true
});

// Static method to get all available skins
skinSchema.statics.getAvailableSkins = function() {
  const now = new Date();
  return this.find({
    'availability.isAvailable': true,
    $or: [
      { 'availability.endDate': null },
      { 'availability.endDate': { $gt: now } }
    ]
  });
};

// Static method to find a skin by ID
skinSchema.statics.findSkinById = function(id) {
  return this.findOne({ id });
};

// Method to check if a skin is compatible with a dragon type
skinSchema.methods.isCompatibleWith = function(dragonType) {
  return this.dragonTypes.includes('All') || this.dragonTypes.includes(dragonType);
};

// Initialize skin templates
skinSchema.statics.initializeSkinTemplates = async function() {
  const skins = [
    {
      id: 'skin_fire',
      name: 'Rồng Lửa',
      description: 'Skin rồng lửa màu đỏ rực rỡ',
      price: 50,
      imageUrl: '/assets/skins/fire_dragon.png',
      rarity: 'COMMON',
      dragonTypes: ['All']
    },
    {
      id: 'skin_water',
      name: 'Rồng Nước',
      description: 'Skin rồng nước màu xanh sáng bóng',
      price: 50,
      imageUrl: '/assets/skins/water_dragon.png',
      rarity: 'COMMON',
      dragonTypes: ['All']
    },
    {
      id: 'skin_earth',
      name: 'Rồng Đất',
      description: 'Skin rồng đất màu nâu và xanh lá',
      price: 80,
      imageUrl: '/assets/skins/earth_dragon.png',
      rarity: 'RARE',
      dragonTypes: ['All']
    },
    {
      id: 'skin_lightning',
      name: 'Rồng Sấm',
      description: 'Skin rồng sấm với màu vàng điện và tím',
      price: 80,
      imageUrl: '/assets/skins/lightning_dragon.png',
      rarity: 'RARE',
      dragonTypes: ['All']
    },
    {
      id: 'skin_royal',
      name: 'Rồng Hoàng Gia',
      description: 'Skin rồng hoàng gia với màu vàng và đỏ sẫm',
      price: 120,
      imageUrl: '/assets/skins/royal_dragon.png',
      rarity: 'EPIC',
      dragonTypes: ['All']
    },
    {
      id: 'skin_shadow',
      name: 'Rồng Bóng Tối',
      description: 'Skin rồng bóng tối với màu đen tuyền và tím',
      price: 120,
      imageUrl: '/assets/skins/shadow_dragon.png',
      rarity: 'EPIC',
      dragonTypes: ['All']
    },
    {
      id: 'skin_celestial',
      name: 'Rồng Thiên Thể',
      description: 'Skin rồng thiên thể với màu sắc của vũ trụ',
      price: 200,
      imageUrl: '/assets/skins/celestial_dragon.png',
      rarity: 'LEGENDARY',
      dragonTypes: ['All']
    },
    {
      id: 'skin_robot',
      name: 'Rồng Robot',
      description: 'Skin rồng robot với các bộ phận cơ khí kim loại',
      price: 200,
      imageUrl: '/assets/skins/robot_dragon.png',
      rarity: 'LEGENDARY',
      dragonTypes: ['All']
    }
  ];

  // Create all skins if they don't exist
  for (const skin of skins) {
    await this.findOneAndUpdate(
      { id: skin.id },
      skin,
      { upsert: true, new: true }
    );
  }
  
  console.log('Skin templates initialized');
};

const Skin = mongoose.model('Skin', skinSchema);

export default Skin;
