// MongoShopItemModel.js - MongoDB schema and model for shop items
import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true,
    unique: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['DRAGON', 'SKIN', 'RESOURCE_PACK', 'SPECIAL_OFFER']
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
    amount: { 
      type: Number, 
      required: true,
      min: 0
    },
    currency: { 
      type: String, 
      required: true,
      enum: ['CRYSTAL', 'DRAGONCOIN', 'REAL_MONEY']
    }
  },
  imageUrl: { 
    type: String 
  },
  level: { 
    type: Number,
    default: null // Used for dragons
  },
  stats: {
    crystalRate: { type: Number },
    tokenRate: { type: Number }
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
    },
    stock: {
      type: Number,
      default: null // null means unlimited stock
    }
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  itemReference: {
    type: String, // Reference to dragon or skin ID
    default: null
  }
}, {
  timestamps: true
});

// Static method to get available shop items by type
shopItemSchema.statics.getAvailableItemsByType = function(type) {
  const now = new Date();
  return this.find({
    type,
    'availability.isAvailable': true,
    $or: [
      { 'availability.endDate': null },
      { 'availability.endDate': { $gt: now } }
    ],
    $or: [
      { 'availability.stock': null },
      { 'availability.stock': { $gt: 0 } }
    ]
  });
};

// Static method to find a shop item by ID
shopItemSchema.statics.findShopItemById = function(id) {
  return this.findOne({ id });
};

// Method to calculate final price after discount
shopItemSchema.methods.getFinalPrice = function() {
  if (!this.discountPercent) {
    return this.price.amount;
  }
  
  return Math.round(this.price.amount * (1 - this.discountPercent / 100));
};

// Method to decrease stock after purchase
shopItemSchema.methods.decreaseStock = async function() {
  if (this.availability.stock === null) {
    return true; // Unlimited stock
  }
  
  if (this.availability.stock <= 0) {
    return false; // Out of stock
  }
  
  this.availability.stock -= 1;
  await this.save();
  return true;
};

// Initialize shop item templates
shopItemSchema.statics.initializeShopItemTemplates = async function() {
  // Dragon shop items
  const dragonItems = [
    {
      id: 'shop_dragon_level_1',
      type: 'DRAGON',
      name: 'Rồng cấp 1',
      description: 'Rồng cơ bản, tạo ra ít tài nguyên',
      price: {
        amount: 100,
        currency: 'CRYSTAL'
      },
      imageUrl: '/assets/dragons/level1_dragon.png',
      level: 1,
      stats: {
        crystalRate: 0.1,
        tokenRate: 0.05
      }
    },
    {
      id: 'shop_dragon_level_2',
      type: 'DRAGON',
      name: 'Rồng cấp 2',
      description: 'Rồng nâng cao, tạo ra nhiều tài nguyên hơn rồng cấp 1',
      price: {
        amount: 250,
        currency: 'CRYSTAL'
      },
      imageUrl: '/assets/dragons/level2_dragon.png',
      level: 2,
      stats: {
        crystalRate: 0.2,
        tokenRate: 0.1
      }
    },
    {
      id: 'shop_dragon_level_3',
      type: 'DRAGON',
      name: 'Rồng cấp 3',
      description: 'Rồng mạnh, tạo ra nhiều tài nguyên hơn rồng cấp 2',
      price: {
        amount: 600,
        currency: 'CRYSTAL'
      },
      imageUrl: '/assets/dragons/level3_dragon.png',
      level: 3,
      stats: {
        crystalRate: 0.4,
        tokenRate: 0.2
      }
    }
  ];

  // Resource packages
  const resourcePacks = [
    {
      id: 'shop_pack_crystal_small',
      type: 'RESOURCE_PACK',
      name: 'Gói tinh thể nhỏ',
      description: 'Gói 100 tinh thể rồng',
      price: {
        amount: 30,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/crystal_small.png'
    },
    {
      id: 'shop_pack_crystal_medium',
      type: 'RESOURCE_PACK',
      name: 'Gói tinh thể vừa',
      description: 'Gói 300 tinh thể rồng',
      price: {
        amount: 80,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/crystal_medium.png'
    },
    {
      id: 'shop_pack_crystal_large',
      type: 'RESOURCE_PACK',
      name: 'Gói tinh thể lớn',
      description: 'Gói 1000 tinh thể rồng',
      price: {
        amount: 220,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/crystal_large.png',
      discountPercent: 15
    },
    {
      id: 'shop_pack_token_small',
      type: 'RESOURCE_PACK',
      name: 'Gói DragonCoin nhỏ',
      description: 'Gói 50 DragonCoin',
      price: {
        amount: 20,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/token_small.png'
    },
    {
      id: 'shop_pack_token_medium',
      type: 'RESOURCE_PACK',
      name: 'Gói DragonCoin vừa',
      description: 'Gói 150 DragonCoin',
      price: {
        amount: 50,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/token_medium.png'
    },
    {
      id: 'shop_pack_token_large',
      type: 'RESOURCE_PACK',
      name: 'Gói DragonCoin lớn',
      description: 'Gói 500 DragonCoin',
      price: {
        amount: 120,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/token_large.png',
      discountPercent: 20
    }
  ];

  // Special offers
  const specialOffers = [
    {
      id: 'shop_special_starter',
      type: 'SPECIAL_OFFER',
      name: 'Gói Khởi Đầu',
      description: 'Gói khởi đầu với 1 rồng cấp 2 và 200 tinh thể',
      price: {
        amount: 100,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/starter_pack.png',
      availability: {
        isAvailable: true,
        stock: 1 // One-time purchase per user
      },
      discountPercent: 30
    },
    {
      id: 'shop_special_weekly',
      type: 'SPECIAL_OFFER',
      name: 'Ưu Đãi Tuần',
      description: 'Ưu đãi hàng tuần với nhiều tài nguyên và vật phẩm',
      price: {
        amount: 150,
        currency: 'REAL_MONEY'
      },
      imageUrl: '/assets/packs/weekly_offer.png',
      availability: {
        isAvailable: true,
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)) // 7 days from now
      },
      discountPercent: 25
    }
  ];

  // Create all shop items if they don't exist
  const allShopItems = [...dragonItems, ...resourcePacks, ...specialOffers];
  
  for (const item of allShopItems) {
    await this.findOneAndUpdate(
      { id: item.id },
      item,
      { upsert: true, new: true }
    );
  }
  
  console.log('Shop item templates initialized');
};

const ShopItem = mongoose.model('ShopItem', shopItemSchema);

export default ShopItem;
