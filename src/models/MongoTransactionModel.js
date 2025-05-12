// MongoTransactionModel.js - MongoDB schema and model for transactions
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['TOP_UP', 'PURCHASE', 'MERGE', 'COLLECT', 'REWARD']
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true,
    enum: ['CRYSTAL', 'DRAGONCOIN', 'REAL_MONEY']
  },
  itemId: { 
    type: String, 
    default: null // ID of the item purchased or reference
  },
  status: { 
    type: String, 
    required: true,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentMethod: { 
    type: String,
    enum: ['MOMO', 'BANK_TRANSFER', 'CARD', 'INTERNAL', 'NONE'],
    default: 'NONE'
  },
  reference: { 
    type: String, 
    default: null // Transaction reference code
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed, // For any additional data
    default: {}
  }
}, {
  timestamps: true
});

// Static method to create a new transaction
transactionSchema.statics.createTransaction = async function(data) {
  const transaction = new this(data);
  await transaction.save();
  return transaction;
};

// Static method to find transactions by user ID
transactionSchema.statics.findByUserId = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find pending transactions
transactionSchema.statics.findPendingTransactions = function() {
  return this.find({ status: 'PENDING' })
    .sort({ createdAt: 1 });
};

// Method to complete a transaction
transactionSchema.methods.complete = async function() {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  await this.save();
  return this;
};

// Method to fail a transaction
transactionSchema.methods.fail = async function(reason) {
  this.status = 'FAILED';
  this.metadata.failReason = reason;
  await this.save();
  return this;
};

// Method to refund a transaction
transactionSchema.methods.refund = async function(reason) {
  this.status = 'REFUNDED';
  this.metadata.refundReason = reason;
  await this.save();
  return this;
};

// Generate a unique reference code for a transaction
transactionSchema.statics.generateReferenceCode = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TXN-${timestamp.substr(-6)}-${random}`;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
