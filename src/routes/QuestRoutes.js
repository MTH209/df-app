// QuestRoutes.js - Routes for quest operations
import express from 'express';
import QuestController from '../controllers/QuestController.js';

const router = express.Router();
const questController = new QuestController();

// Initialize player quests
router.post('/initialize/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.initializePlayerQuests(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in initialize player quests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get player quests
router.get('/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.getPlayerQuests(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get player quests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get daily quests
router.get('/daily/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.getDailyQuests(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get daily quests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check and reset daily quests
router.post('/daily/reset/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.checkAndResetDailyQuests(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in reset daily quests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Claim quest reward
router.post('/claim/:telegramId/:questId', async (req, res) => {
  try {
    const { telegramId, questId } = req.params;
    const result = await questController.claimQuestReward(telegramId, questId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in claim quest reward route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Claim all completed quests
router.post('/claim-all/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.claimAllCompletedQuests(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in claim all quests route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle login quest (event routes for quest progress)
router.post('/event/login/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.handleLogin(telegramId);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in login quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle collection quest
router.post('/event/collect/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { amount } = req.body;
    const result = await questController.handleResourceCollected(telegramId, amount);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in collection quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle dragon upgrade quest
router.post('/event/upgrade/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.handleDragonUpgraded(telegramId);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in upgrade quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle friend added quest
router.post('/event/friend-added/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.handleFriendAdded(telegramId);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in friend added quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle game shared quest
router.post('/event/game-shared/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.handleGameShared(telegramId);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in game shared quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Handle add to homescreen quest
router.post('/event/add-homescreen/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await questController.handleAddToHomescreen(telegramId);
    res.status(200).json({ success: true, updatedQuests: result });
  } catch (error) {
    console.error('Error in add to homescreen quest route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
