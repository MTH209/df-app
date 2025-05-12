// TelegramBotService.js - Handles Telegram bot interactions
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import UserController from '../controllers/UserController.js';
import NotificationController from '../controllers/NotificationController.js';
import FriendController from '../controllers/FriendController.js';
import DragonController from '../controllers/DragonController.js';
import QuestController from '../controllers/QuestController.js';

// Load environment variables
dotenv.config();

// Bot states for managing conversation flow
const STATES = {
  IDLE: 'IDLE',
  AWAITING_REGISTER_USERNAME: 'AWAITING_REGISTER_USERNAME',
  AWAITING_REGISTER_PASSWORD: 'AWAITING_REGISTER_PASSWORD',
  AWAITING_LOGIN_USERNAME: 'AWAITING_LOGIN_USERNAME',
  AWAITING_LOGIN_PASSWORD: 'AWAITING_LOGIN_PASSWORD'
};

class TelegramBotService {
  constructor() {
    // Check if token is available
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env file');
    }

    // Initialize the bot
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    
    // Initialize controllers
    this.userController = new UserController();
    this.notificationController = new NotificationController();
    this.friendController = new FriendController(this.userController);
    this.dragonController = new DragonController();
    this.questController = new QuestController(this.dragonController, this.dragonController.resourceModel);
    
    // Connect controllers
    this.dragonController.setUserController(this.userController);
    this.questController.setUserController(this.userController);
    
    // Set up resource collection interval (every 5 minutes)
    setInterval(() => this.updateAllPlayersResources(), 5 * 60 * 1000);
    
    // Track user states
    this.userStates = {};
    
    // Define additional states for friends functionality
    this.FRIEND_STATES = {
      AWAITING_FRIEND_USERNAME: 'AWAITING_FRIEND_USERNAME'
    };
    
    // Track registration data during the process
    this.registrationData = {};
    
    // Add some welcome notifications for all users (demo purpose)
    this.createDemoNotifications();

    // Setup message handlers
    this.setupHandlers();
  }

  // Create demo notifications for testing
  createDemoNotifications() {
    // This would normally be called when specific events happen in the game
    // or when system messages need to be sent
    
    // We'll create these when users register, in the handleRegisterPassword method
  }

  // Setup all message handlers
  setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.resetUserState(chatId);
      
      const welcomeMessage = 'Welcome to the Game Bot! 🎮\n\n' +
        'Please use one of the following commands:\n' +
        '/register - Create a new account\n' +
        '/login - Login to your account\n' +
        '/help - Show available commands';
      
      this.bot.sendMessage(chatId, welcomeMessage);
    });

    // Handle /register command
    this.bot.onText(/\/register/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if already registered
      if (this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You are already registered! Use /login instead.');
        return;
      }
      
      this.userStates[chatId] = STATES.AWAITING_REGISTER_USERNAME;
      this.registrationData[chatId] = { telegramId: userId };
      
      this.bot.sendMessage(chatId, 'Please enter your desired username:');
    });

    // Handle /login command
    this.bot.onText(/\/login/, (msg) => {
      const chatId = msg.chat.id;
      
      this.userStates[chatId] = STATES.AWAITING_LOGIN_USERNAME;
      this.bot.sendMessage(chatId, 'Please enter your username:');
    });

    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      
      const helpMessage = 'Available commands:\n' +
        '/start - Start the bot\n' +
        '/register - Create a new account\n' +
        '/login - Login to your account\n' +
        '/mailbox - Check your notifications\n' +
        '/friends - Manage your friends list\n' +
        '/addfriend - Add a new friend\n' +
        '/requests - View friend requests\n' +
        '/dragons - View your dragons\n' +
        '/collect - Collect resources\n' +
        '/leaderboard - View token rankings\n' +
        '/quests - View daily and special quests\n' +
        '/help - Show this help message';
      
      this.bot.sendMessage(chatId, helpMessage);
    });
    
    // Handle /friends command
    this.bot.onText(/\/friends/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Show friends list
      this.showFriendsList(chatId, userId);
    });
    
    // Handle /addfriend command
    this.bot.onText(/\/addfriend/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Set state to await username input
      this.userStates[chatId] = this.FRIEND_STATES.AWAITING_FRIEND_USERNAME;
      
      this.bot.sendMessage(chatId, 'Please enter the username of the friend you want to add:');
    });
    
    // Handle /requests command
    this.bot.onText(/\/requests/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Show friend requests
      this.showFriendRequests(chatId, userId);
    });
    
    // Handle /dragons command
    this.bot.onText(/\/dragons/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Show dragons
      this.showDragons(chatId, userId);
    });
    
    // Handle /collect command
    this.bot.onText(/\/collect/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Handle resource collection
      this.collectResources(chatId, userId);
    });
    
    // Handle /leaderboard command
    this.bot.onText(/\/leaderboard/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Show leaderboard
      this.showTokenLeaderboard(chatId, userId);
    });
    
    // Handle /quests command
    this.bot.onText(/\/quests/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Show quests
      this.showQuestsMenu(chatId, userId);
    });
    
    // Handle /mailbox command
    this.bot.onText(/\/mailbox/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      
      // Check if user is registered
      if (!this.userController.isUserRegistered(userId)) {
        this.bot.sendMessage(chatId, 'You need to register first. Use /register to create an account.');
        return;
      }
      
      // Get user notifications
      this.showMailbox(chatId, userId);
    });

    // Handle all other messages based on user state
    this.bot.on('message', (msg) => {
      if (msg.text && msg.text.startsWith('/')) {
        // Skip command messages, they're handled above
        return;
      }
      
      const chatId = msg.chat.id;
      const text = msg.text;
      
      // Handle messages based on user state
      this.handleMessageByState(chatId, text);
    });
  }

  // Handle messages based on current user state
  handleMessageByState(chatId, text) {
    const state = this.userStates[chatId] || STATES.IDLE;
    
    switch (state) {
      case STATES.AWAITING_REGISTER_USERNAME:
        this.handleRegisterUsername(chatId, text);
        break;
        
      case STATES.AWAITING_REGISTER_PASSWORD:
        this.handleRegisterPassword(chatId, text);
        break;
        
      case STATES.AWAITING_LOGIN_USERNAME:
        this.handleLoginUsername(chatId, text);
        break;
        
      case STATES.AWAITING_LOGIN_PASSWORD:
        this.handleLoginPassword(chatId, text);
        break;
      
      case this.FRIEND_STATES.AWAITING_FRIEND_USERNAME:
        this.handleAddFriend(chatId, text, msg.from.id);
        break;
        
      case STATES.IDLE:
      default:
        this.bot.sendMessage(chatId, 'Use /start to begin or /help to see available commands.');
        break;
    }
  }

  // Handle username input during registration
  handleRegisterUsername(chatId, username) {
    if (username.length < 3) {
      this.bot.sendMessage(chatId, 'Username must be at least 3 characters. Please try again:');
      return;
    }
    
    // Store username and ask for password
    this.registrationData[chatId].username = username;
    this.userStates[chatId] = STATES.AWAITING_REGISTER_PASSWORD;
    
    this.bot.sendMessage(chatId, 'Please enter your password (minimum 6 characters):');
  }

  // Handle password input during registration
  handleRegisterPassword(chatId, password) {
    if (password.length < 6) {
      this.bot.sendMessage(chatId, 'Password must be at least 6 characters. Please try again:');
      return;
    }
    
    // Get registration data
    const { telegramId, username } = this.registrationData[chatId];
    
    // Register the user
    const result = this.userController.register(telegramId, username, password);
    
    if (result.success) {
      // Initialize player with default dragon
      const dragonResult = this.dragonController.initializePlayer(telegramId);
      
      // Registration success message
      let welcomeMessage = `Registration successful! Welcome, ${username}!\n\n`;
      
      // Add dragon info if initialization was successful
      if (dragonResult.success) {
        const dragon = dragonResult.dragon;
        welcomeMessage += `You received a ${dragon.name} (Level ${dragon.level})!\n`;
        welcomeMessage += `• Crystal generation: ${dragon.stats.crystalRate}/sec\n`;
        welcomeMessage += `• Token generation: ${dragon.stats.tokenRate}/sec\n\n`;
        welcomeMessage += `Your dragon will generate resources even when you're offline. Use /collect to gather them.\n\n`;
      }
      
      welcomeMessage += `You can now use /login to access your account.`;
      
      this.bot.sendMessage(chatId, welcomeMessage);
      
      // Add welcome notifications
      this.notificationController.sendNotification(telegramId, {
        title: 'Welcome to Dragon Game!',
        content: `Hello ${username}! Welcome to our game. You've received your first dragon. Take good care of it to earn more resources!`,
        type: 'success'
      });
      
      this.notificationController.sendNotification(telegramId, {
        title: 'Dragon Care Guide',
        content: 'Your dragon generates crystals and tokens automatically. Collect them regularly and use crystals to upgrade your dragon!',
        type: 'info'
      });
      
      this.notificationController.sendNotification(telegramId, {
        title: 'Game Tutorial',
        content: 'New to the game? Check out our tutorial for beginners to get started quickly!',
        type: 'info'
      });
    } else {
      this.bot.sendMessage(chatId, `Registration failed: ${result.message}. Please try again with /register.`);
    }
    
    // Reset state
    this.resetUserState(chatId);
  }

  // Handle username input during login
  handleLoginUsername(chatId, username) {
    // Store username temporarily and ask for password
    this.registrationData[chatId] = { username };
    this.userStates[chatId] = STATES.AWAITING_LOGIN_PASSWORD;
    
    this.bot.sendMessage(chatId, 'Please enter your password:');
  }

  // Handle password input during login
  handleLoginPassword(chatId, password) {
    const { username } = this.registrationData[chatId];
    
    // Attempt login
    const result = this.userController.login(username, password);
    
    if (result.success) {
      // Get user and check unread notifications and friend requests
      const userId = this.userController.getUserByTelegramId(chatId)?.id || chatId;
      const unreadCount = this.notificationController.getUnreadCount(userId);
      const pendingRequestsCount = this.friendController.getFriendRequestCount(userId);
      
      // Collect resources that accumulated while offline
      const resourceResult = this.dragonController.collectResources(userId);
      
      const welcomeMessage = `Login successful! Welcome back, ${username}!\n\n` +
        `• ${unreadCount} unread notifications\n` +
        `• ${pendingRequestsCount} pending friend requests\n` +
        `• Collected: ${resourceResult.collected.crystals.toFixed(1)} crystals and ${resourceResult.collected.tokens.toFixed(1)} tokens\n` +
        `• Total: ${resourceResult.totalResources.crystals.toFixed(1)} crystals and ${resourceResult.totalResources.tokens.toFixed(1)} tokens`;
      
      const keyboard = {
        inline_keyboard: [
          [{ text: 'My Dragons', callback_data: 'view_dragons' }, { text: 'Collect Resources', callback_data: 'collect_resources' }],
          [{ text: `Mailbox (${unreadCount})`, callback_data: 'view_mailbox' }, { text: `Friends`, callback_data: 'view_friends' }],
          [{ text: 'Leaderboard', callback_data: 'view_leaderboard' }, { text: `Requests (${pendingRequestsCount})`, callback_data: 'view_friend_requests' }]
        ]
      };
      
      this.bot.sendMessage(chatId, welcomeMessage, { reply_markup: keyboard });
    } else {
      this.bot.sendMessage(chatId, `Login failed: ${result.message}. Please try again with /login.`);
    }
    
    // Reset state
    this.resetUserState(chatId);
  }

  // Reset user state
  resetUserState(chatId) {
    this.userStates[chatId] = STATES.IDLE;
    delete this.registrationData[chatId];
  }

  // Display mailbox with notifications
  showMailbox(chatId, userId) {
    // Get notifications for user
    const notifications = this.notificationController.getUserNotifications(userId);
    const unreadCount = this.notificationController.getUnreadCount(userId);
    
    if (notifications.length === 0) {
      this.bot.sendMessage(chatId, 'Your mailbox is empty.');
      return;
    }
    
    // Prepare message
    let mailboxMessage = `📬 *Your Mailbox* (${unreadCount} unread)\n\n`;
    
    // Add each notification as a summary
    notifications.forEach((notification, index) => {
      const statusIcon = notification.isRead ? '👁️' : '🆕';
      const typeIcon = this.getNotificationTypeIcon(notification.type);
      
      mailboxMessage += `${index + 1}. ${statusIcon} ${typeIcon} *${notification.title}*\n`;
    });
    
    mailboxMessage += '\nSelect a notification to view details:';
    
    // Create keyboard with notification options
    const keyboard = {
      inline_keyboard: [
        ...notifications.slice(0, 5).map((notification, index) => [
          { text: `${index + 1}. ${notification.title}`, callback_data: `view_notification_${notification.id}` }
        ]),
        [{ text: 'Mark All as Read', callback_data: 'mark_all_read' }],
        [{ text: 'Close Mailbox', callback_data: 'close_mailbox' }]
      ]
    };
    
    this.bot.sendMessage(chatId, mailboxMessage, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard 
    });
  }
  
  // Get icon for notification type
  getNotificationTypeIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': 
      default: return 'ℹ️';
    }
  }
  
  // Handle callback queries from inline keyboards
  setupCallbackHandlers() {
    this.bot.on('callback_query', (callbackQuery) => {
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;
      const userId = callbackQuery.from.id;
      const action = callbackQuery.data;
      
      // Basic message to show we received the callback
      this.bot.answerCallbackQuery(callbackQuery.id);
      
      // Handle mailbox actions
      if (action === 'view_mailbox') {
        this.showMailbox(chatId, userId);
      }
      else if (action.startsWith('view_notification_')) {
        const notificationId = action.replace('view_notification_', '');
        this.showNotificationDetail(chatId, userId, notificationId, msg.message_id);
      }
      // Shop system callbacks
      else if (action === 'view_shop') {
        this.showShopMenu(chatId, userId);
      }
      else if (action === 'view_dragon_shop') {
        this.showDragonShop(chatId, userId);
      }
      else if (action === 'view_skin_shop') {
        this.showSkinShop(chatId, userId);
      }
      else if (action === 'top_up_money') {
        this.showTopUpOptions(chatId, userId);
      }
      else if (action.startsWith('buy_dragon_')) {
        const dragonLevel = action.replace('buy_dragon_', '');
        this.buyDragon(chatId, userId, dragonLevel);
      }
      else if (action.startsWith('buy_skin_')) {
        const skinId = action.replace('buy_skin_', '');
        this.buySkin(chatId, userId, skinId);
      }
      else if (action.startsWith('top_up_')) {
        const amount = action.replace('top_up_', '');
        this.processTopUp(chatId, userId, amount);
      }
      else if (action === 'create_new_dragon') {
        this.createNewDragon(chatId, userId);
      }
      else if (action.startsWith('merge_dragons_')) {
        const level = action.replace('merge_dragons_', '');
        this.mergeDragons(chatId, userId, level);
      }
      else if (action.startsWith('select_merge_dragon_')) {
        // Store selected dragon for merging
        const dragonId = action.replace('select_merge_dragon_', '');
        if (!this.mergeSelections) this.mergeSelections = {};
        if (!this.mergeSelections[userId]) this.mergeSelections[userId] = [];
        
        // Add selection if not already there
        if (!this.mergeSelections[userId].includes(dragonId)) {
          this.mergeSelections[userId].push(dragonId);
        }
        
        // If we have two selections, process the merge
        if (this.mergeSelections[userId].length === 2) {
          const [dragonId1, dragonId2] = this.mergeSelections[userId];
          // Reset selections
          delete this.mergeSelections[userId];
          // Process the merge
          this.confirmMergeDragons(chatId, userId, dragonId1, dragonId2);
        } else {
          // Inform about first selection
          this.bot.sendMessage(chatId, `Đã chọn rồng đầu tiên! Hãy chọn rồng thứ hai để ghép.`);
        }
      }
      else if (action === 'mark_all_read') {
        const result = this.notificationController.markAllAsRead(userId);
        this.bot.answerCallbackQuery(callbackQuery.id, { text: result.message });
        this.showMailbox(chatId, userId); // Refresh the mailbox view
      }
      else if (action.startsWith('view_notification_')) {
        const notificationId = action.replace('view_notification_', '');
        this.showNotificationDetail(chatId, userId, notificationId, msg.message_id);
      }
      // Friend system callbacks
      else if (action === 'view_friends') {
        this.showFriendsList(chatId, userId);
      }
      else if (action === 'view_friend_requests') {
        this.showFriendRequests(chatId, userId);
      }
      else if (action.startsWith('accept_friend_')) {
        const senderId = action.replace('accept_friend_', '');
        this.acceptFriendRequest(chatId, userId, senderId);
      }
      else if (action.startsWith('reject_friend_')) {
        const senderId = action.replace('reject_friend_', '');
        this.rejectFriendRequest(chatId, userId, senderId);
      }
      else if (action.startsWith('remove_friend_')) {
        const friendId = action.replace('remove_friend_', '');
        this.removeFriend(chatId, userId, friendId);
      }
      else if (action === 'add_new_friend') {
        this.userStates[chatId] = this.FRIEND_STATES.AWAITING_FRIEND_USERNAME;
        this.bot.sendMessage(chatId, 'Please enter the username of the friend you want to add:');
      }
      // Dragon system callbacks
      else if (action === 'view_dragons') {
        this.showDragons(chatId, userId);
      }
      else if (action === 'collect_resources') {
        this.collectResources(chatId, userId);
      }
      else if (action.startsWith('view_dragon_')) {
        const dragonId = action.replace('view_dragon_', '');
        this.showDragonDetail(chatId, userId, dragonId);
      }
      else if (action.startsWith('upgrade_dragon_')) {
        const dragonId = action.replace('upgrade_dragon_', '');
        this.upgradeDragon(chatId, userId, dragonId);
      }
      else if (action === 'back_to_dragons') {
        this.showDragons(chatId, userId);
      }
      // Leaderboard callbacks
      else if (action === 'view_leaderboard') {
        this.showTokenLeaderboard(chatId, userId);
      }
      else if (action === 'view_crystal_leaderboard') {
        this.showCrystalLeaderboard(chatId, userId);
      }
      else if (action === 'view_token_leaderboard') {
        this.showTokenLeaderboard(chatId, userId);
      }
      // Quest callbacks
      else if (action === 'view_quests') {
        this.showQuestsMenu(chatId, userId);
      }
      else if (action === 'view_daily_quests') {
        this.showDailyQuests(chatId, userId);
      }
      else if (action === 'view_special_quests') {
        this.showSpecialQuests(chatId, userId);
      }
      else if (action.startsWith('claim_quest_')) {
        const questId = action.replace('claim_quest_', '');
        this.claimQuestReward(chatId, userId, questId);
      }
      // New quest action handlers
      else if (action === 'share_game') {
        this.handleShareGame(chatId, userId);
      }
      else if (action === 'add_to_homescreen') {
        this.handleAddToHomescreen(chatId, userId);
      }
      else if (action === 'subscribe_channels') {
        this.handleSubscribeChannels(chatId, userId);
      }
      else if (action === 'confirm_homescreen_add') {
        this.handleConfirmHomescreenAdd(chatId, userId);
      }
      else if (action === 'confirm_channel_subscribe') {
        this.handleConfirmChannelSubscribe(chatId, userId);
      }
      // Handle other callback actions as needed
    });
  }
  
  // Show notification details
  showNotificationDetail(chatId, userId, notificationId, messageId) {
    // Get all user notifications
    const notifications = this.notificationController.getUserNotifications(userId);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      this.bot.sendMessage(chatId, 'Notification not found.');
      return;
    }
    
    // Mark as read
    this.notificationController.markAsRead(userId, notificationId);
    
    // Prepare detailed message
    const typeIcon = this.getNotificationTypeIcon(notification.type);
    let detailMessage = `${typeIcon} *${notification.title}*\n\n`;
    detailMessage += `${notification.content}\n\n`;
    detailMessage += `📅 ${notification.timestamp.toLocaleString()}`;
    
    // Create keyboard for actions
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Back to Mailbox', callback_data: 'view_mailbox' }],
        [{ text: 'Delete This Message', callback_data: `delete_notification_${notificationId}` }]
      ]
    };
    
    // Try to edit the existing message or send a new one
    if (messageId) {
      this.bot.editMessageText(detailMessage, { 
        chat_id: chatId, 
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      }).catch(() => {
        // If editing fails (e.g., identical message), send a new one
        this.bot.sendMessage(chatId, detailMessage, { 
          parse_mode: 'Markdown',
          reply_markup: keyboard 
        });
      });
    } else {
      this.bot.sendMessage(chatId, detailMessage, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });
    }
  }

  // Handle adding a friend by username
  handleAddFriend(chatId, friendUsername, userId) {
    // Reset state first
    this.resetUserState(chatId);
    
    if (!friendUsername || friendUsername.trim() === '') {
      this.bot.sendMessage(chatId, 'Invalid username. Please try again with /addfriend.');
      return;
    }
    
    // Send friend request
    const result = this.friendController.sendFriendRequest(userId, friendUsername.trim());
    
    if (result.success) {
      if (result.autoAccepted) {
        // Automatically accepted (mutual requests)
        this.bot.sendMessage(chatId, `${result.message}! You are now friends with ${friendUsername}.`);
        
        // Send notification to the other user
        const foundFriend = this.friendController.findFriendByUsername(userId, friendUsername);
        if (foundFriend) {
          this.notificationController.sendNotification(foundFriend.userId, {
            title: 'New Friend Added',
            content: `You and ${this.userController.getUserByTelegramId(userId)?.username || 'a user'} are now friends!`,
            type: 'success'
          });
        }
      } else {
        this.bot.sendMessage(chatId, `${result.message} to ${friendUsername}.`);
      }
    } else {
      this.bot.sendMessage(chatId, `Failed to add friend: ${result.message}`);
    }
  }
  
  // Show user's friends list
  showFriendsList(chatId, userId) {
    const result = this.friendController.getFriendsList(userId);
    
    if (result.count === 0) {
      const keyboard = {
        inline_keyboard: [
          [{ text: 'Add New Friend', callback_data: 'add_new_friend' }]
        ]
      };
      
      this.bot.sendMessage(chatId, 'You don\'t have any friends yet. Add some friends to play together!', {
        reply_markup: keyboard
      });
      return;
    }
    
    // Create message with friends list
    let message = `👥 *Your Friends (${result.count})*\n\n`;
    
    result.friends.forEach((friend, index) => {
      const onlineStatus = friend.isOnline ? '🟢 Online' : '⚪ Offline';
      message += `${index + 1}. *${friend.username}* - ${onlineStatus}\n`;
      if (friend.lastSeen) {
        message += `   Last seen: ${new Date(friend.lastSeen).toLocaleDateString()}\n`;
      }
      message += '\n';
    });
    
    // Create inline keyboard with actions
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Add New Friend', callback_data: 'add_new_friend' }],
        [{ text: 'View Friend Requests', callback_data: 'view_friend_requests' }],
        ...result.friends.slice(0, 5).map(friend => [
          { text: `❌ Remove ${friend.username}`, callback_data: `remove_friend_${friend.userId}` }
        ])
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show pending friend requests
  showFriendRequests(chatId, userId) {
    const result = this.friendController.getFriendRequests(userId);
    
    if (result.count === 0) {
      this.bot.sendMessage(chatId, 'You don\'t have any pending friend requests.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'View Friends List', callback_data: 'view_friends' }],
            [{ text: 'Add New Friend', callback_data: 'add_new_friend' }]
          ]
        }
      });
      return;
    }
    
    // Create message with friend requests list
    let message = `🔔 *Friend Requests (${result.count})*\n\n`;
    message += 'The following users want to be your friend:\n\n';
    
    result.requests.forEach((request, index) => {
      message += `${index + 1}. *${request.username}*\n`;
      message += `   Sent: ${new Date(request.timestamp).toLocaleString()}\n\n`;
    });
    
    // Create inline keyboard for each request
    const keyboard = {
      inline_keyboard: result.requests.map(request => [
        { text: `✅ Accept ${request.username}`, callback_data: `accept_friend_${request.senderId}` },
        { text: `❌ Reject`, callback_data: `reject_friend_${request.senderId}` }
      ])
    };
    
    // Add a back button
    keyboard.inline_keyboard.push([{ text: 'Back to Friends', callback_data: 'view_friends' }]);
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Accept a friend request
  acceptFriendRequest(chatId, userId, senderId) {
    const result = this.friendController.acceptFriendRequest(userId, senderId);
    
    if (result.success) {
      this.bot.sendMessage(chatId, result.message);
      
      // Send notification to the other user
      this.notificationController.sendNotification(senderId, {
        title: 'Friend Request Accepted',
        content: `${this.userController.getUserByTelegramId(userId)?.username || 'A user'} accepted your friend request!`,
        type: 'success'
      });
      
      // Show updated friend requests
      this.showFriendRequests(chatId, userId);
    } else {
      this.bot.sendMessage(chatId, `Error: ${result.message}`);
    }
  }
  
  // Reject a friend request
  rejectFriendRequest(chatId, userId, senderId) {
    const result = this.friendController.rejectFriendRequest(userId, senderId);
    
    if (result.success) {
      this.bot.answerCallbackQuery(callbackQuery.id, { text: result.message });
      
      // Show updated friend requests
      this.showFriendRequests(chatId, userId);
    } else {
      this.bot.sendMessage(chatId, `Error: ${result.message}`);
    }
  }
  
  // Remove a friend
  removeFriend(chatId, userId, friendId) {
    const result = this.friendController.removeFriend(userId, friendId);
    
    if (result.success) {
      this.bot.sendMessage(chatId, result.message);
      
      // Show updated friends list
      this.showFriendsList(chatId, userId);
    } else {
      this.bot.sendMessage(chatId, `Error: ${result.message}`);
    }
  }

  // Show player's dragons
  showDragons(chatId, userId) {
    // Get player's dragons
    const result = this.dragonController.getPlayerDragons(userId);
    
    if (result.count === 0) {
      // This shouldn't happen as players get a default dragon, but just in case
      const initResult = this.dragonController.initializePlayer(userId);
      if (initResult.success) {
        this.bot.sendMessage(chatId, 'Bạn đã nhận được rồng mới! Sử dụng /dragons để xem.');
      } else {
        this.bot.sendMessage(chatId, 'Bạn chưa có rồng nào. Vui lòng liên hệ hỗ trợ.');
      }
      return;
    }
    
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Calculate generation rates
    const rates = this.dragonController.calculateGenerationRates(userId);
    
    // Create message with dragon list
    let message = `🐉 *Rồng của bạn (${result.count})*\n\n`;
    message += `*Tài nguyên:*\n`;
    message += `• Tinh thể rồng: ${resources.crystals.toFixed(0)} (${rates.crystalsPerHour.toFixed(1)}/giờ)\n`;
    message += `• DragonCoin: ${resources.tokens.toFixed(0)} (${rates.tokensPerHour.toFixed(1)}/giờ)\n\n`;
    message += `*Danh sách rồng:*\n`;
    
    // Group dragons by level for merging
    const dragonsByLevel = {};
    result.dragons.forEach(dragon => {
      if (!dragonsByLevel[dragon.level]) {
        dragonsByLevel[dragon.level] = [];
      }
      dragonsByLevel[dragon.level].push(dragon);
    });
    
    result.dragons.forEach((dragon, index) => {
      message += `${index + 1}. ${dragon.name} - Cấp ${dragon.level}\n`;
      message += `   Tạo ra: ${dragon.stats.crystalRate}/giây tinh thể, ${dragon.stats.tokenRate}/giây DragonCoin\n`;
      
      // Check if this dragon can be merged
      const sameLevelCount = dragonsByLevel[dragon.level] ? dragonsByLevel[dragon.level].length : 0;
      if (sameLevelCount >= 2) {
        message += `   ✨ Có thể ghép với rồng cùng cấp!\n`;
      }
      
      message += '\n';
    });
    
    // Create inline keyboard for actions
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Thu thập tài nguyên', callback_data: 'collect_resources' }],
        [{ text: 'Tạo rồng mới', callback_data: 'create_new_dragon' }]
      ]
    };
    
    // Add dragon specific buttons
    result.dragons.forEach(dragon => {
      keyboard.inline_keyboard.push([
        { text: `Xem ${dragon.name} (Cấp ${dragon.level})`, callback_data: `view_dragon_${dragon.id}` }
      ]);
    });
    
    // Add merge buttons for levels with at least 2 dragons
    Object.keys(dragonsByLevel).forEach(level => {
      if (dragonsByLevel[level].length >= 2) {
        keyboard.inline_keyboard.push([
          { text: `Ghép rồng cấp ${level}`, callback_data: `merge_dragons_${level}` }
        ]);
      }
    });
    
    keyboard.inline_keyboard.push([{ text: 'Quay lại Menu Chính', callback_data: 'back_to_main' }]);
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show details for a specific dragon
  showDragonDetail(chatId, userId, dragonId) {
    // Get player's dragons
    const dragons = this.dragonController.getPlayerDragons(userId).dragons;
    const dragon = dragons.find(d => d.id === dragonId);
    
    if (!dragon) {
      this.bot.sendMessage(chatId, 'Không tìm thấy rồng');
      return;
    }
    
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    let message = `🐉 *${dragon.name}* (Cấp ${dragon.level})\n\n`;
    message += `*Loại:* ${dragon.type}\n`;
    message += `*Mô tả:* ${dragon.description}\n\n`;
    message += `*Tốc độ tạo ra tài nguyên:*\n`;
    message += `• Tinh thể rồng: ${dragon.stats.crystalRate}/giây\n`;
    message += `• DragonCoin: ${dragon.stats.tokenRate}/giây\n\n`;
    
    // Count dragons of same level for merging
    const sameLevelDragons = dragons.filter(d => d.level === dragon.level);
    const canMerge = sameLevelDragons.length >= 2;
    
    if (canMerge) {
      message += `✨ *Ghép rồng:*\n`;
      message += `Bạn có ${sameLevelDragons.length} rồng cấp ${dragon.level}.\n`;
      message += `Ghép 2 rồng cấp ${dragon.level} để tạo rồng cấp ${dragon.level + 1}\n\n`;
    }
    
    // Create action buttons
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }],
        [{ text: 'Quay lại', callback_data: 'back_to_dragons' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show quests menu with options for daily and special quests
  showQuestsMenu(chatId, userId) {
    // Check for any unclaimed completed quests
    const unclaimedQuests = this.questController.getCompletedUnclaimedQuests(userId);
    const hasUnclaimedQuests = unclaimedQuests.length > 0;
    
    // Get quest stats
    const stats = this.questController.getQuestStats(userId);
    
    // Get time until daily quest reset
    const timeUntilReset = this.questController.getTimeUntilDailyReset(userId);
    
    // Create message
    let message = `💼 *Trung tâm nhiệm vụ* 💼\n\n`;
    
    if (hasUnclaimedQuests) {
      message += `❗ *Bạn có ${unclaimedQuests.length} nhiệm vụ đã hoàn thành chưa nhận thưởng!*\n\n`;
    }
    
    message += `*Thống kê nhiệm vụ:*\n`;
    message += `• Tổng nhiệm vụ đã hoàn thành: ${stats.totalCompleted}\n`;
    message += `• Nhiệm vụ hàng ngày đã hoàn thành: ${stats.dailyCompleted}\n`;
    message += `• Nhiệm vụ đặc biệt đã hoàn thành: ${stats.specialCompleted}\n\n`;
    
    message += `*Tổng phần thưởng đã nhận:*\n`;
    message += `• Tinh thể rồng: ${stats.totalRewards.crystals}\n`;
    message += `• DragonCoin: ${stats.totalRewards.tokens}\n`;
    message += `• Kinh nghiệm: ${stats.totalRewards.experience}\n\n`;
    
    message += `Nhiệm vụ hàng ngày làm mới trong: ${timeUntilReset.formatted}`;
    
    // Create keyboard with quest-related actions
    const questKeyboard = {
      inline_keyboard: [
        [{ text: 'Nhiệm vụ hàng ngày', callback_data: 'view_daily_quests' }],
        [{ text: 'Nhiệm vụ đặc biệt', callback_data: 'view_special_quests' }],
        [{ text: 'Chia sẻ game', callback_data: 'share_game' }],
        [{ text: 'Thêm vào màn hình chính', callback_data: 'add_to_homescreen' }],
        [{ text: 'Đăng ký kênh', callback_data: 'subscribe_channels' }]
      ]
    };
    
    // If there are unclaimed quests, add a quick claim button
    if (hasUnclaimedQuests) {
      questKeyboard.inline_keyboard.unshift([
        { text: `Nhận thưởng ${unclaimedQuests.length} nhiệm vụ đã hoàn thành`, callback_data: `claim_quest_${unclaimedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: questKeyboard
    });
  }
  
  // Handle share game action
  handleShareGame(chatId, userId) {
    // Get share link
    const shareLink = `https://t.me/dragon_forge_bot?start=${userId}`; // Example referral link
    
    // Create share message
    const message = `✨ *Chia sẻ DragonForge với bạn bè* ✨\n\n`
      + `Chia sẻ đường dẫn này với bạn bè của bạn để họ tham gia DragonForge và cả hai cùng nhận phần thưởng!\n\n`
      + `${shareLink}\n\n`
      + `Khi bạn chia sẻ đường dẫn trên, bạn sẽ hoàn thành nhiệm vụ chia sẻ game hàng ngày.`;
    
    // Update quest progress
    const completedQuests = this.questController.handleGameShared(userId);
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Sao chép đường dẫn', callback_data: 'copy_share_link' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle add to homescreen action
  handleAddToHomescreen(chatId, userId) {
    // Create instructions message
    const message = `📱 *Thêm DragonForge vào màn hình chính* 📱\n\n`
      + `Các bước thêm DragonForge vào màn hình chính của bạn:\n\n`
      + `*Trên Android:*\n`
      + `1. Mở trình duyệt Chrome\n`
      + `2. Truy cập vào web app DragonForge\n`
      + `3. Nhấn vào menu ba chấm ở góc trên bên phải\n`
      + `4. Chọn "Thêm vào màn hình chính"\n\n`
      + `*Trên iOS:*\n`
      + `1. Mở trình duyệt Safari\n`
      + `2. Truy cập vào web app DragonForge\n`
      + `3. Nhấn vào nút chia sẻ (hình vuông với mũi tên)\n`
      + `4. Chọn "Thêm vào màn hình chính"\n\n`
      + `Khi bạn đã hoàn thành, nhấn nút "Đã thêm vào màn hình chính" bên dưới.`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Đã thêm vào màn hình chính', callback_data: 'confirm_homescreen_add' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle confirm homescreen add
  handleConfirmHomescreenAdd(chatId, userId) {
    // Update quest progress
    const completedQuests = this.questController.handleAddToHomescreen(userId);
    
    // Create success message
    const message = `🎉 *Tuyệt vời!* 🎉\n\n`
      + `Bạn đã thêm DragonForge vào màn hình chính thành công!`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle subscribe channels action
  handleSubscribeChannels(chatId, userId) {
    // Create channels message
    const message = `📺 *Đăng ký các kênh chính thức* 📺\n\n`
      + `Đăng ký theo dõi các kênh chính thức của DragonForge để nhận tin tức mới nhất và nội dung độc quyền!\n\n`
      + `*Các kênh chính thức:*\n`
      + `• [Kênh Telegram DragonForge](https://t.me/dragonforge_channel)\n`
      + `• [YouTube DragonForge](https://youtube.com/dragonforge)\n`
      + `• [Twitter DragonForge](https://twitter.com/dragonforge)\n\n`
      + `Khi bạn đã đăng ký tất cả các kênh, nhấn nút "Đã đăng ký" bên dưới.`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Đã đăng ký', callback_data: 'confirm_channel_subscribe' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: false
    });
  }
  
  // Handle confirm channel subscribe
  handleConfirmChannelSubscribe(chatId, userId) {
    // Update quest progress
    const completedQuests = this.questController.handleChannelSubscribe(userId);
    
    // Create success message
    const message = `🎉 *Cảm ơn bạn đã đăng ký!* 🎉\n\n`
      + `Bạn đã đăng ký thành công các kênh chính thức của DragonForge!`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  

  
  // Show daily quests
  showDailyQuests(chatId, userId) {
    // Get daily quests
    const dailyQuests = this.questController.getDailyQuests(userId);
    
    // Get time until reset
    const timeUntilReset = this.questController.getTimeUntilDailyReset(userId);
    
    // Create message
    let message = `📅 *Daily Quests* 📅\n\n`;
    message += `These quests reset in ${timeUntilReset.formatted}\n\n`;
    
    if (dailyQuests.length === 0) {
      message += 'You have no active daily quests. Check back tomorrow!';
    } else {
      dailyQuests.forEach((quest, index) => {
        const progressPercent = Math.round((quest.progress / quest.objective.target) * 100);
        const progressBar = this.createProgressBar(progressPercent);
        const statusIcon = quest.completed ? (quest.claimed ? '✅' : '💰') : '⏳';
        
        message += `${index + 1}. ${statusIcon} *${quest.title}*\n`;
        message += `   ${quest.description}\n`;
        message += `   Progress: ${quest.progress}/${quest.objective.target} (${progressPercent}%)\n`;
        message += `   ${progressBar}\n`;
        
        // Show rewards
        message += `   Rewards: ${quest.reward.crystals} 💎, ${quest.reward.tokens} 💰, ${quest.reward.experience} XP\n`;
        
        // Show claim button status
        if (quest.completed && !quest.claimed) {
          message += `   *Ready to claim!*\n`;
        } else if (quest.claimed) {
          message += `   *Claimed!*\n`;
        }
        
        message += '\n';
      });
    }
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Back to Quest Center', callback_data: 'view_quests' }]
      ]
    };
    
    // Add claim buttons for completed quests
    const completedQuests = dailyQuests.filter(q => q.completed && !q.claimed);
    if (completedQuests.length > 0) {
      completedQuests.forEach(quest => {
        keyboard.inline_keyboard.unshift([
          { text: `Claim: ${quest.title}`, callback_data: `claim_quest_${quest.id}` }
        ]);
      });
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show special quests
  showSpecialQuests(chatId, userId) {
    // Get special quests
    const specialQuests = this.questController.getSpecialQuests(userId);
    
    // Create message
    let message = `✨ *Special Quests* ✨\n\n`;
    message += `These are long-term quests with bigger rewards!\n\n`;
    
    if (specialQuests.length === 0) {
      message += 'You have no active special quests currently.';
    } else {
      specialQuests.forEach((quest, index) => {
        const progressPercent = Math.round((quest.progress / quest.objective.target) * 100);
        const progressBar = this.createProgressBar(progressPercent);
        const statusIcon = quest.completed ? (quest.claimed ? '✅' : '💰') : '⏳';
        
        message += `${index + 1}. ${statusIcon} *${quest.title}*\n`;
        message += `   ${quest.description}\n`;
        message += `   Progress: ${quest.progress}/${quest.objective.target} (${progressPercent}%)\n`;
        message += `   ${progressBar}\n`;
        
        // Show rewards
        message += `   Rewards: ${quest.reward.crystals} 💎, ${quest.reward.tokens} 💰, ${quest.reward.experience} XP\n`;
        
        // Show claim button status
        if (quest.completed && !quest.claimed) {
          message += `   *Ready to claim!*\n`;
        } else if (quest.claimed) {
          message += `   *Claimed!*\n`;
        }
        
        // Show expiry if applicable
        if (quest.expiresAt) {
          const expiryDate = new Date(quest.expiresAt);
          message += `   Expires: ${expiryDate.toLocaleDateString()}\n`;
        }
        
        message += '\n';
      });
    }
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Back to Quest Center', callback_data: 'view_quests' }]
      ]
    };
    
    // Add claim buttons for completed quests
    const completedQuests = specialQuests.filter(q => q.completed && !q.claimed);
    if (completedQuests.length > 0) {
      completedQuests.forEach(quest => {
        keyboard.inline_keyboard.unshift([
          { text: `Claim: ${quest.title}`, callback_data: `claim_quest_${quest.id}` }
        ]);
      });
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Helper to create a visual progress bar
  createProgressBar(percent, length = 10) {
    const filledCount = Math.floor(percent / (100 / length));
    const emptyCount = length - filledCount;
    
    return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
  }
  
  // Claim quest reward
  claimQuestReward(chatId, userId, questId) {
    const result = this.questController.claimQuestReward(userId, questId);
    
    if (result.success) {
      const quest = result.quest;
      const rewards = result.rewards;
      
      // Create success message
      let message = `🎉 *Quest Completed!* 🎉\n\n`;
      message += `You completed: *${quest.title}*\n\n`;
      message += `*Rewards:*\n`;
      message += `• ${rewards.crystals} Crystals 💎\n`;
      message += `• ${rewards.tokens} Tokens 💰\n`;
      message += `• ${rewards.experience} Experience ⭐\n\n`;
      
      // Create keyboard
      const keyboard = {
        inline_keyboard: [
          [{ text: 'View All Quests', callback_data: 'view_quests' }]
        ]
      };
      
      // Add buttons based on quest type
      if (quest.type === 'DAILY') {
        keyboard.inline_keyboard.push([{ text: 'View Daily Quests', callback_data: 'view_daily_quests' }]);
      } else {
        keyboard.inline_keyboard.push([{ text: 'View Special Quests', callback_data: 'view_special_quests' }]);
      }
      
      // Check if there are more completed quests
      const moreCompletedQuests = this.questController.getCompletedUnclaimedQuests(userId);
      if (moreCompletedQuests.length > 0) {
        message += `You have ${moreCompletedQuests.length} more quest${moreCompletedQuests.length > 1 ? 's' : ''} ready to claim!\n`;
        keyboard.inline_keyboard.unshift([{ 
          text: `Claim Next Quest`, 
          callback_data: `claim_quest_${moreCompletedQuests[0].id}` 
        }]);
      }
      
      this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      // Handle error
      this.bot.sendMessage(chatId, `Error: ${result.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Back to Quests', callback_data: 'view_quests' }]
          ]
        }
      });
    }
  }

  // Update quest progress when login happens
  updateQuestsOnLogin(userId) {
    // Handle login quest progress and streak
    return this.questController.handlePlayerLogin(userId);
  }
  
  // Update quest progress when resources are collected
  updateQuestsOnResourceCollection(userId, crystals, tokens) {
    return this.questController.handleResourceCollection(userId, crystals, tokens);
  }
  
  // Update quest progress when dragon is upgraded
  updateQuestsOnDragonUpgrade(userId) {
    return this.questController.handleDragonUpgrade(userId);
  }
  
  // Update quest progress when dragon levels up
  updateQuestsOnDragonLevelUp(userId, dragonId, newLevel) {
    return this.questController.handleDragonLevelUp(userId, dragonId, newLevel);
  }
  
  // Create a new dragon with crystals
  createNewDragon(chatId, userId) {
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Define creation cost
    const creationCost = 100; // Adjust as needed
    
    if (resources.crystals < creationCost) {
      this.bot.sendMessage(chatId, `❌ *Không đủ tinh thể rồng!*\n\nBạn cần ${creationCost} tinh thể rồng để tạo rồng mới.\nHiện tại bạn có: ${resources.crystals.toFixed(0)} tinh thể rồng.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
      return;
    }
    
    // Create the dragon
    const result = this.dragonController.createNewDragon(userId, creationCost);
    
    if (result.success) {
      // Update quests
      this.updateQuestsOnDragonUpgrade(userId);
      
      this.bot.sendMessage(chatId, `✨ *Rồng mới đã được tạo!* ✨\n\nBạn đã tạo thành công một rồng mới: *${result.dragon.name}* (Cấp ${result.dragon.level})\n\nTốc độ tạo ra tài nguyên:\n• Tinh thể rồng: ${result.dragon.stats.crystalRate}/giây\n• DragonCoin: ${result.dragon.stats.tokenRate}/giây`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Xem rồng mới', callback_data: `view_dragon_${result.dragon.id}` }],
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
    } else {
      this.bot.sendMessage(chatId, `❌ Lỗi: ${result.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
    }
  }
  
  // Merge two dragons of the same level
  mergeDragons(chatId, userId, level) {
    // Get player's dragons
    const result = this.dragonController.getPlayerDragons(userId);
    const sameLevelDragons = result.dragons.filter(d => d.level === parseInt(level));
    
    if (sameLevelDragons.length < 2) {
      this.bot.sendMessage(chatId, `❌ *Không đủ rồng để ghép!*\n\nBạn cần ít nhất 2 rồng cấp ${level} để ghép thành rồng cấp cao hơn.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
      return;
    }
    
    // Ask for confirmation with dragon selection
    const dragonButtons = sameLevelDragons.map(dragon => [
      { text: `${dragon.name} (Cấp ${dragon.level})`, callback_data: `select_merge_dragon_${dragon.id}` }
    ]);
    
    let message = `🐉 *Ghép rồng cấp ${level}* 🐉\n\n`;
    message += `Chọn 2 rồng để ghép thành rồng cấp ${parseInt(level) + 1}:\n\n`;
    message += `*Lưu ý:* 2 rồng được chọn sẽ biến mất và bạn sẽ nhận được 1 rồng mới cấp ${parseInt(level) + 1}!`;
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          ...dragonButtons,
          [{ text: 'Hủy ghép', callback_data: 'view_dragons' }]
        ]
      }
    });
  }
  
  // Confirm merging two specific dragons
  confirmMergeDragons(chatId, userId, dragonId1, dragonId2) {
    // Perform the merge
    const result = this.dragonController.mergeDragons(userId, dragonId1, dragonId2);
    
    if (result.success) {
      // Update quests
      this.updateQuestsOnDragonUpgrade(userId);
      this.updateQuestsOnDragonLevelUp(userId, result.newDragon.id, result.newDragon.level);
      
      this.bot.sendMessage(chatId, `✨ *Ghép rồng thành công!* ✨\n\nBạn đã ghép thành công 2 rồng và nhận được:\n*${result.newDragon.name}* (Cấp ${result.newDragon.level})\n\nTốc độ tạo ra tài nguyên:\n• Tinh thể rồng: ${result.newDragon.stats.crystalRate}/giây\n• DragonCoin: ${result.newDragon.stats.tokenRate}/giây`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Xem rồng mới', callback_data: `view_dragon_${result.newDragon.id}` }],
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
    } else {
      this.bot.sendMessage(chatId, `❌ Lỗi: ${result.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại Danh sách rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
    }
  }
  
  // Update quest progress when friend is added
  updateQuestsOnFriendAdded(userId) {
    return this.questController.handleFriendAdded(userId);
  }
  
  // Handle share game action
  handleShareGame(chatId, userId) {
    // Get share link
    const shareLink = `https://t.me/dragon_forge_bot?start=${userId}`; // Example referral link
    
    // Create share message
    const message = `✨ *Chia sẻ DragonForge với bạn bè* ✨\n\n`
      + `Chia sẻ đường dẫn này với bạn bè của bạn để họ tham gia DragonForge và cả hai cùng nhận phần thưởng!\n\n`
      + `${shareLink}\n\n`
      + `Khi bạn chia sẻ đường dẫn trên, bạn sẽ hoàn thành nhiệm vụ chia sẻ game hàng ngày.`;
    
    // Update quest progress
    const completedQuests = this.questController.handleGameShared(userId);
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Sao chép đường dẫn', callback_data: 'copy_share_link' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle add to homescreen action
  handleAddToHomescreen(chatId, userId) {
    // Create instructions message
    const message = `📱 *Thêm DragonForge vào màn hình chính* 📱\n\n`
      + `Các bước thêm DragonForge vào màn hình chính của bạn:\n\n`
      + `*Trên Android:*\n`
      + `1. Mở trình duyệt Chrome\n`
      + `2. Truy cập vào web app DragonForge\n`
      + `3. Nhấn vào menu ba chấm ở góc trên bên phải\n`
      + `4. Chọn "Thêm vào màn hình chính"\n\n`
      + `*Trên iOS:*\n`
      + `1. Mở trình duyệt Safari\n`
      + `2. Truy cập vào web app DragonForge\n`
      + `3. Nhấn vào nút chia sẻ (hình vuông với mũi tên)\n`
      + `4. Chọn "Thêm vào màn hình chính"\n\n`
      + `Khi bạn đã hoàn thành, nhấn nút "Đã thêm vào màn hình chính" bên dưới.`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Đã thêm vào màn hình chính', callback_data: 'confirm_homescreen_add' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle confirm homescreen add
  handleConfirmHomescreenAdd(chatId, userId) {
    // Update quest progress
    const completedQuests = this.questController.handleAddToHomescreen(userId);
    
    // Create success message
    const message = `🎉 *Tuyệt vời!* 🎉\n\n`
      + `Bạn đã thêm DragonForge vào màn hình chính thành công!`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Handle subscribe channels action
  handleSubscribeChannels(chatId, userId) {
    // Create channels message
    const message = `📺 *Đăng ký các kênh chính thức* 📺\n\n`
      + `Đăng ký theo dõi các kênh chính thức của DragonForge để nhận tin tức mới nhất và nội dung độc quyền!\n\n`
      + `*Các kênh chính thức:*\n`
      + `• [Kênh Telegram DragonForge](https://t.me/dragonforge_channel)\n`
      + `• [YouTube DragonForge](https://youtube.com/dragonforge)\n`
      + `• [Twitter DragonForge](https://twitter.com/dragonforge)\n\n`
      + `Khi bạn đã đăng ký tất cả các kênh, nhấn nút "Đã đăng ký" bên dưới.`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Đã đăng ký', callback_data: 'confirm_channel_subscribe' }],
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      disable_web_page_preview: false
    });
  }
  
  // Handle confirm channel subscribe
  handleConfirmChannelSubscribe(chatId, userId) {
    // Update quest progress
    const completedQuests = this.questController.handleChannelSubscribe(userId);
    
    // Create success message
    const message = `🎉 *Cảm ơn bạn đã đăng ký!* 🎉\n\n`
      + `Bạn đã đăng ký thành công các kênh chính thức của DragonForge!`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: 'Quay lại nhiệm vụ', callback_data: 'view_quests' }]
      ]
    };
    
    // If quests were completed, add claim button
    if (completedQuests.length > 0) {
      keyboard.inline_keyboard.unshift([
        { text: 'Nhận phần thưởng nhiệm vụ', callback_data: `claim_quest_${completedQuests[0].id}` }
      ]);
    }
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  

  
  // Update resources for all active players
  updateAllPlayersResources() {
    // This would normally iterate through all active players
    // and update their resources
    console.log('Updating resources for all players...');
  }

  // Show main shop menu
  showShopMenu(chatId, userId) {
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Create message
    let message = `🛍️ *Cửa hàng DragonForge* 🛍️\n\n`;
    message += `Chào mừng đến với cửa hàng DragonForge!\n\n`;
    message += `*Tài khoản của bạn:*\n`;
    message += `• Tinh thể rồng: ${resources.crystals.toFixed(0)} 💎\n`;
    message += `• DragonCoin: ${resources.tokens.toFixed(0)} 💰\n`;
    message += `• Xu nạp: ${resources.realMoney || 0} 💵\n\n`;
    message += `Hãy chọn danh mục bạn muốn xem:`;
    
    // Create keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: '🐉 Cửa hàng Rồng', callback_data: 'view_dragon_shop' }],
        [{ text: '🛏️ Cửa hàng Skin Rồng', callback_data: 'view_skin_shop' }],
        [{ text: '💳 Nạp tiền', callback_data: 'top_up_money' }],
        [{ text: 'Quay lại Menu Chính', callback_data: 'back_to_main' }]
      ]
    };
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show dragon shop
  showDragonShop(chatId, userId) {
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Create message
    let message = `🐉 *Cửa hàng Rồng* 🐉\n\n`;
    message += `Mua rồng mới bằng tinh thể rồng!\n\n`;
    message += `*Tài khoản của bạn:*\n`;
    message += `• Tinh thể rồng: ${resources.crystals.toFixed(0)} 💎\n\n`;
    message += `*Danh sách rồng có sẵn:*\n\n`;
    
    // Define available dragons
    const availableDragons = [
      { level: 1, name: 'Rồng Cơ Bản', price: 100, description: 'Rồng cấp 1 cơ bản, tạo tinh thể và DragonCoin chậm' },
      { level: 2, name: 'Rồng Khỏi Đầu', price: 300, description: 'Rồng cấp 2, tạo nhiều tài nguyên hơn rồng cơ bản' },
      { level: 3, name: 'Rồng Quý Hiếm', price: 600, description: 'Rồng cấp 3, tạo tài nguyên nhanh, dùng cho người chơi cấp cao' },
      { level: 4, name: 'Rồng Huyền Thoại', price: 1200, description: 'Rồng cấp 4 với tốc độ tạo tài nguyên rất cao' },
      { level: 5, name: 'Rồng Thần Thoại', price: 2500, description: 'Rồng cấp 5 hiếm có, tạo ra rất nhiều tài nguyên' }
    ];
    
    // Create dragon list in message
    availableDragons.forEach(dragon => {
      message += `*${dragon.name}* (Cấp ${dragon.level})\n`;
      message += `• Mô tả: ${dragon.description}\n`;
      message += `• Giá: ${dragon.price} tinh thể rồng 💎\n`;
      message += resources.crystals >= dragon.price ? `✅ Bạn có đủ tinh thể để mua!` : `❌ Không đủ tinh thể!`;
      message += '\n\n';
    });
    
    // Create keyboard with buy buttons
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add buy buttons for each dragon
    availableDragons.forEach(dragon => {
      const canBuy = resources.crystals >= dragon.price;
      keyboard.inline_keyboard.push([
        { 
          text: `${canBuy ? '💎' : '❌'} Mua ${dragon.name} (${dragon.price} tinh thể)`, 
          callback_data: `buy_dragon_${dragon.level}` 
        }
      ]);
    });
    
    // Add navigation buttons
    keyboard.inline_keyboard.push([
      { text: 'Quay lại Cửa hàng', callback_data: 'view_shop' },
      { text: 'Xem Rồng của bạn', callback_data: 'view_dragons' }
    ]);
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Show skin shop
  showSkinShop(chatId, userId) {
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Create message
    let message = `🛏️ *Cửa hàng Skin Rồng* 🛏️\n\n`;
    message += `Mua skin để thay đổi hình dạng của rồng bằng xu nạp!\n\n`;
    message += `*Tài khoản của bạn:*\n`;
    message += `• Xu nạp: ${resources.realMoney || 0} 💵\n\n`;
    message += `*Danh sách skin rồng:*\n\n`;
    
    // Define available skins
    const availableSkins = [
      { id: 'skin_fire', name: 'Rồng Lửa', price: 50, description: 'Skin rồng lửa màu đỏ rực rỡ' },
      { id: 'skin_water', name: 'Rồng Nước', price: 50, description: 'Skin rồng nước màu xanh sáng bóng' },
      { id: 'skin_earth', name: 'Rồng Đất', price: 80, description: 'Skin rồng đất màu nâu và xanh lá' },
      { id: 'skin_lightning', name: 'Rồng Sấm', price: 80, description: 'Skin rồng sấm với màu vàng điện và tím' },
      { id: 'skin_royal', name: 'Rồng Hoàng Gia', price: 120, description: 'Skin rồng hoàng gia với màu vàng và đỏ sẫm' },
      { id: 'skin_shadow', name: 'Rồng Bóng Tối', price: 120, description: 'Skin rồng bóng tối với màu đen tuyền và tím' },
      { id: 'skin_celestial', name: 'Rồng Thiên Thể', price: 200, description: 'Skin rồng thiên thể với màu sắc của vũ trụ' },
      { id: 'skin_robot', name: 'Rồng Robot', price: 200, description: 'Skin rồng robot với các bộ phận cơ khí kim loại' }
    ];
    
    // Create skin list in message
    availableSkins.forEach(skin => {
      message += `*${skin.name}*\n`;
      message += `• Mô tả: ${skin.description}\n`;
      message += `• Giá: ${skin.price} xu nạp 💵\n`;
      message += (resources.realMoney || 0) >= skin.price ? `✅ Bạn có đủ xu để mua!` : `❌ Không đủ xu!`;
      message += '\n\n';
    });
    
    // Create keyboard with buy buttons
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add buy buttons for each skin
    availableSkins.forEach(skin => {
      const canBuy = (resources.realMoney || 0) >= skin.price;
      keyboard.inline_keyboard.push([
        { 
          text: `${canBuy ? '💵' : '❌'} Mua ${skin.name} (${skin.price} xu)`, 
          callback_data: `buy_skin_${skin.id}` 
        }
      ]);
    });
    
    // Add navigation buttons
    keyboard.inline_keyboard.push([
      { text: 'Quay lại Cửa hàng', callback_data: 'view_shop' },
      { text: 'Nạp tiền', callback_data: 'top_up_money' }
    ]);
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  // Show top-up options
  showTopUpOptions(chatId, userId) {
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Create message
    let message = `💳 *Nạp tiền* 💳\n\n`;
    message += `Nạp xu để mua các skin rồng độc quyền và nhiều vật phẩm khác!\n\n`;
    message += `*Tài khoản của bạn:*\n`;
    message += `• Xu nạp hiện tại: ${resources.realMoney || 0} 💵\n\n`;
    message += `*Các gói nạp:*\n\n`;
    
    // Define top-up packages
    const topUpPackages = [
      { amount: 50, price: '20.000 VND', bonus: '' },
      { amount: 100, price: '35.000 VND', bonus: '(Tiết kiệm 12.5%)' },
      { amount: 200, price: '65.000 VND', bonus: '(Tiết kiệm 18.75%)' },
      { amount: 500, price: '150.000 VND', bonus: '(Tiết kiệm 25% + Skin Rồng Miễn Phí)' },
      { amount: 1000, price: '290.000 VND', bonus: '(Tiết kiệm 27.5% + Skin Rồng Đặc Biệt)' }
    ];
    
    // Create top-up package list in message
    topUpPackages.forEach((pack, index) => {
      message += `*Gói ${index + 1}: ${pack.amount} Xu*\n`;
      message += `• Giá: ${pack.price}\n`;
      if (pack.bonus) message += `• Ưđãi: ${pack.bonus}\n`;
      message += '\n';
    });
    
    message += `*Cách thức thanh toán:*\n`;
    message += `Sau khi chọn gói, bạn sẽ nhận được hướng dẫn thanh toán qua Momo, Banking hoặc thẻ cào.`;
    
    // Create keyboard with buy buttons
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add buy buttons for each package
    topUpPackages.forEach((pack, index) => {
      keyboard.inline_keyboard.push([
        { text: `Nạp ${pack.amount} xu - ${pack.price}`, callback_data: `top_up_${pack.amount}` }
      ]);
    });
    
    // Add navigation button
    keyboard.inline_keyboard.push([
      { text: 'Quay lại Cửa hàng', callback_data: 'view_shop' }
    ]);
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
  
  // Process top-up request
  processTopUp(chatId, userId, amount) {
    // In a real implementation, you would integrate with a payment provider here
    // For demo purposes, we'll just show instructions
    
    // Get package details
    const topUpPackages = [
      { amount: 50, price: '20.000 VND', bonus: '' },
      { amount: 100, price: '35.000 VND', bonus: '(Tiết kiệm 12.5%)' },
      { amount: 200, price: '65.000 VND', bonus: '(Tiết kiệm 18.75%)' },
      { amount: 500, price: '150.000 VND', bonus: '(Tiết kiệm 25% + Skin Rồng Miễn Phí)' },
      { amount: 1000, price: '290.000 VND', bonus: '(Tiết kiệm 27.5% + Skin Rồng Đặc Biệt)' }
    ];
    
    const selectedPackage = topUpPackages.find(p => p.amount === parseInt(amount));
    
    if (!selectedPackage) {
      this.bot.sendMessage(chatId, 'Gói nạp không hợp lệ. Vui lòng thử lại!', {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Quay lại', callback_data: 'top_up_money' }
          ]]
        }
      });
      return;
    }
    
    // Create payment instructions message
    let message = `💳 *Hướng dẫn nạp ${selectedPackage.amount} xu* 💳\n\n`;
    message += `*Gói đã chọn:* ${selectedPackage.amount} Xu - ${selectedPackage.price}\n\n`;
    message += `*Cách thức thanh toán:*\n\n`;
    message += `*1. Momo:*\n`;
    message += `• Số điện thoại: 0912345678\n`;
    message += `• Tên: Dragon Forge Games\n`;
    message += `• Nội dung: DF${userId}_${selectedPackage.amount}\n\n`;
    message += `*2. Chuyển khoản ngân hàng:*\n`;
    message += `• Số tài khoản: 123456789\n`;
    message += `• Ngân hàng: VCB\n`;
    message += `• Tên: Dragon Forge JSC\n`;
    message += `• Nội dung: DF${userId}_${selectedPackage.amount}\n\n`;
    message += `*3. Thẻ cào:*\n`;
    message += `• Gửi mã thẻ vào bot: /napthe [loại thẻ] [mệnh giá] [mã thẻ] [serial]\n\n`;
    message += `_Lưu ý: Để đảm bảo việc nạp tiền thành công, vui lòng ghi đúng nội dung chuyển khoản. Sau khi thanh toán, xu sẽ được cộng vào tài khoản của bạn trong vòng 5 phút._`;
    
    this.bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Đã chuyển khoản', callback_data: 'payment_completed' }],
          [{ text: 'Hỗ trợ', callback_data: 'contact_support' }],
          [{ text: 'Quay lại', callback_data: 'top_up_money' }]
        ]
      }
    });
    
    // In a real implementation, you would have a callback endpoint and server-side validation
    // For demo purposes, we'll just let them go back to the menu
  }
  
  // Buy a dragon with crystals
  buyDragon(chatId, userId, level) {
    // Define available dragons
    const availableDragons = [
      { level: 1, name: 'Rồng Cơ Bản', price: 100, description: 'Rồng cấp 1 cơ bản, tạo tinh thể và DragonCoin chậm' },
      { level: 2, name: 'Rồng Khỏi Đầu', price: 300, description: 'Rồng cấp 2, tạo nhiều tài nguyên hơn rồng cơ bản' },
      { level: 3, name: 'Rồng Quý Hiếm', price: 600, description: 'Rồng cấp 3, tạo tài nguyên nhanh, dùng cho người chơi cấp cao' },
      { level: 4, name: 'Rồng Huyền Thoại', price: 1200, description: 'Rồng cấp 4 với tốc độ tạo tài nguyên rất cao' },
      { level: 5, name: 'Rồng Thần Thoại', price: 2500, description: 'Rồng cấp 5 hiếm có, tạo ra rất nhiều tài nguyên' }
    ];
    
    const selectedDragon = availableDragons.find(d => d.level === parseInt(level));
    
    if (!selectedDragon) {
      this.bot.sendMessage(chatId, 'Rồng không hợp lệ. Vui lòng thử lại!', {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Quay lại', callback_data: 'view_dragon_shop' }
          ]]
        }
      });
      return;
    }
    
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Check if player has enough crystals
    if (resources.crystals < selectedDragon.price) {
      this.bot.sendMessage(chatId, `❌ *Không đủ tinh thể rồng!*\n\nBạn cần ${selectedDragon.price} tinh thể để mua ${selectedDragon.name}.\nHiện tại bạn có: ${resources.crystals.toFixed(0)} tinh thể.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Thu thập thêm tinh thể', callback_data: 'collect_resources' }],
            [{ text: 'Quay lại cửa hàng rồng', callback_data: 'view_dragon_shop' }]
          ]
        }
      });
      return;
    }
    
    // Process purchase
    const result = this.dragonController.purchaseDragon(userId, parseInt(level), selectedDragon.price);
    
    if (result.success) {
      this.bot.sendMessage(chatId, `🎉 *Mua rồng thành công!* 🎉\n\nBạn đã mua thành công *${selectedDragon.name}*.\n\nTốc độ tạo ra tài nguyên:\n• Tinh thể rồng: ${result.dragon.stats.crystalRate}/giây\n• DragonCoin: ${result.dragon.stats.tokenRate}/giây\n\nTinh thể còn lại: ${result.remainingCrystals.toFixed(0)} 💎`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Xem rồng mới', callback_data: `view_dragon_${result.dragon.id}` }],
            [{ text: 'Quay lại cửa hàng', callback_data: 'view_dragon_shop' }],
            [{ text: 'Xem tất cả rồng', callback_data: 'view_dragons' }]
          ]
        }
      });
    } else {
      this.bot.sendMessage(chatId, `❌ Lỗi: ${result.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại cửa hàng rồng', callback_data: 'view_dragon_shop' }]
          ]
        }
      });
    }
  }
  
  // Buy a dragon skin with real money
  buySkin(chatId, userId, skinId) {
    // Define available skins
    const availableSkins = [
      { id: 'skin_fire', name: 'Rồng Lửa', price: 50, description: 'Skin rồng lửa màu đỏ rực rỡ' },
      { id: 'skin_water', name: 'Rồng Nước', price: 50, description: 'Skin rồng nước màu xanh sáng bóng' },
      { id: 'skin_earth', name: 'Rồng Đất', price: 80, description: 'Skin rồng đất màu nâu và xanh lá' },
      { id: 'skin_lightning', name: 'Rồng Sấm', price: 80, description: 'Skin rồng sấm với màu vàng điện và tím' },
      { id: 'skin_royal', name: 'Rồng Hoàng Gia', price: 120, description: 'Skin rồng hoàng gia với màu vàng và đỏ sẫm' },
      { id: 'skin_shadow', name: 'Rồng Bóng Tối', price: 120, description: 'Skin rồng bóng tối với màu đen tuyền và tím' },
      { id: 'skin_celestial', name: 'Rồng Thiên Thể', price: 200, description: 'Skin rồng thiên thể với màu sắc của vũ trụ' },
      { id: 'skin_robot', name: 'Rồng Robot', price: 200, description: 'Skin rồng robot với các bộ phận cơ khí kim loại' }
    ];
    
    const selectedSkin = availableSkins.find(s => s.id === skinId);
    
    if (!selectedSkin) {
      this.bot.sendMessage(chatId, 'Skin không hợp lệ. Vui lòng thử lại!', {
        reply_markup: {
          inline_keyboard: [[
            { text: 'Quay lại', callback_data: 'view_skin_shop' }
          ]]
        }
      });
      return;
    }
    
    // Get player's resources
    const resourceResult = this.dragonController.getPlayerResources(userId);
    const resources = resourceResult.resources;
    
    // Check if player has enough real money
    if ((resources.realMoney || 0) < selectedSkin.price) {
      this.bot.sendMessage(chatId, `❌ *Không đủ xu nạp!*\n\nBạn cần ${selectedSkin.price} xu để mua ${selectedSkin.name}.\nHiện tại bạn có: ${resources.realMoney || 0} xu.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Nạp thêm xu', callback_data: 'top_up_money' }],
            [{ text: 'Quay lại cửa hàng skin', callback_data: 'view_skin_shop' }]
          ]
        }
      });
      return;
    }
    
    // Process purchase
    const result = this.dragonController.purchaseSkin(userId, skinId, selectedSkin.price);
    
    if (result.success) {
      // Get player's dragons for applying skin
      const dragons = this.dragonController.getPlayerDragons(userId).dragons;
      
      // Create selection message for applying skin
      let message = `🎉 *Mua skin thành công!* 🎉\n\nBạn đã mua thành công skin *${selectedSkin.name}*.\n\nBạn muốn áp dụng skin này cho rồng nào?`;
      
      const keyboard = {
        inline_keyboard: []
      };
      
      // Add buttons for each dragon
      dragons.forEach(dragon => {
        keyboard.inline_keyboard.push([
          { text: `${dragon.name} (Cấp ${dragon.level})`, callback_data: `apply_skin_${skinId}_${dragon.id}` }
        ]);
      });
      
      // Add option to save for later
      keyboard.inline_keyboard.push([
        { text: 'Lưu để dùng sau', callback_data: 'save_skin_for_later' }
      ]);
      
      keyboard.inline_keyboard.push([
        { text: 'Quay lại cửa hàng skin', callback_data: 'view_skin_shop' }
      ]);
      
      this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      this.bot.sendMessage(chatId, `❌ Lỗi: ${result.message}`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Quay lại cửa hàng skin', callback_data: 'view_skin_shop' }]
          ]
        }
      });
    }
  }
  
  // Start the bot
  start() {
    // Setup callback query handlers for inline keyboards
    this.setupCallbackHandlers();
    console.log('Telegram bot has started...');
  }
}

export default TelegramBotService;
