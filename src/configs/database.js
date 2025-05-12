// Database configuration for DragonForge
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dragonforge';

// Database connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true,
  serverSelectionTimeoutMS: 5000 // Keep trying to send operations for 5 seconds
};

// Database connection class
class Database {
  constructor() {
    this.connection = null;
  }

  // Connect to MongoDB
  async connect() {
    try {
      if (this.connection) {
        console.log('Using existing database connection');
        return this.connection;
      }

      this.connection = await mongoose.connect(MONGODB_URI, options);
      console.log('Database connection successful');
      
      return this.connection;
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  // Disconnect from MongoDB
  async disconnect() {
    try {
      await mongoose.disconnect();
      this.connection = null;
      console.log('Database disconnected successfully');
    } catch (error) {
      console.error('Database disconnection error:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const database = new Database();
export default database;
