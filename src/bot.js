// Main entry point for the Telegram bot
import TelegramBotService from './services/TelegramBotService.js';

// Create and start the bot
try {
  const bot = new TelegramBotService();
  bot.start();
  console.log('Telegram Game Bot started successfully!');
} catch (error) {
  console.error('Failed to start Telegram bot:', error.message);
}
