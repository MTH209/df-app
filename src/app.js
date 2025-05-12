// app.js - Main Express server setup
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import database from './configs/database.js';
import { verifyToken } from './middlewares/authMiddleware.js';
import { 
  userRoutes, 
  dragonRoutes, 
  questRoutes, 
  friendRoutes, 
  notificationRoutes 
} from './routes/index.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
database.connect()
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middlewares
app.use(cors());
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Public routes (không yêu cầu xác thực)
app.use('/api/users', userRoutes);

// Protected routes (yêu cầu xác thực)
app.use('/api/dragons', verifyToken, dragonRoutes);
app.use('/api/quests', verifyToken, questRoutes);
app.use('/api/friends', verifyToken, friendRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Dragon Friends Game API',
    version: '1.0.0',
    status: 'running'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// 404 route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
