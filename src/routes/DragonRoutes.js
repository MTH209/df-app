// DragonRoutes.js - Routes for dragon operations
import express from 'express';
import DragonController from '../controllers/DragonController.js';

const router = express.Router();
const dragonController = new DragonController();

// Initialize player with first dragon
router.post('/initialize/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await dragonController.initializePlayer(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in initialize player route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get player dragons
router.get('/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await dragonController.getPlayerDragons(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get player dragons route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Collect resources from a dragon
router.post('/collect/:telegramId/:dragonId', async (req, res) => {
  try {
    const { telegramId, dragonId } = req.params;
    const result = await dragonController.collectResources(telegramId, dragonId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in collect resources route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Collect all resources
router.post('/collect-all/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await dragonController.collectAllResources(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in collect all resources route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upgrade dragon
router.post('/upgrade/:telegramId/:dragonId', async (req, res) => {
  try {
    const { telegramId, dragonId } = req.params;
    const result = await dragonController.upgradeDragon(telegramId, dragonId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in upgrade dragon route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Merge dragons
router.post('/merge/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { dragonIds } = req.body;
    
    if (!dragonIds || !Array.isArray(dragonIds) || dragonIds.length !== 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Must provide exactly 2 dragon IDs to merge' 
      });
    }
    
    const result = await dragonController.mergeDragons(telegramId, dragonIds[0], dragonIds[1]);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in merge dragons route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase dragon
router.post('/purchase/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { dragonType } = req.body;
    
    if (!dragonType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dragon type is required' 
      });
    }
    
    const result = await dragonController.purchaseDragon(telegramId, dragonType);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in purchase dragon route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Apply skin to dragon
router.post('/apply-skin/:telegramId/:dragonId', async (req, res) => {
  try {
    const { telegramId, dragonId } = req.params;
    const { skinId } = req.body;
    
    if (!skinId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Skin ID is required' 
      });
    }
    
    const result = await dragonController.applySkin(telegramId, dragonId, skinId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in apply skin route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get player resources
router.get('/resources/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await dragonController.getPlayerResources(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get player resources route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get player skins
router.get('/skins/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const result = await dragonController.getPlayerSkins(telegramId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in get player skins route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase skin
router.post('/purchase-skin/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { skinId } = req.body;
    
    if (!skinId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Skin ID is required' 
      });
    }
    
    const result = await dragonController.purchaseSkin(telegramId, skinId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Error in purchase skin route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
