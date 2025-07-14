const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const SuspiciousBase64Detector = require('./base64'); // Fixed import
const ModerationLogger = require('./mod-log');
const dotenv = require('dotenv');
const config = require('./config'); // Import config

// Load environment variables
dotenv.config();

/**
 * Discord moderation module for handling Base64 messages
 */
module.exports = {
    name: 'mod',
    description: 'Moderation module to handle suspicious Base64 invite codes',
    
    /**
     * Initialize the moderation module
     * @param {Object} client - Discord client
     */
    init(client) {
        console.log('[MOD] Initializing mod module...');
        
        // Store client reference
        this.client = client;
        
        // Track channels with pending moderation messages
        this.pendingModMessages = new Map();
        
        // Initialize the Base64 detector
        try {
            this.base64Detector = new SuspiciousBase64Detector();
            console.log('[MOD] Base64 detector initialized successfully');
        } catch (error) {
            console.error('[MOD] Failed to initialize Base64 detector:', error);
            throw error; // Re-throw to make sure initialization fails
        }
        
        // Initialize the moderation logger
        this.logger = new ModerationLogger(client);
        
        // Load configuration from environment
        this.notificationsEnabled = process.env.NOTIFICATIONS !== 'OFF';
        this.deleteEnabled = process.env.DELETE !== 'NO';
        
        // Get allowed channels from config/env
        this.allowedChannels = null;
        if (process.env.ALLOWED_CHANNEL) {
            this.allowedChannels = process.env.ALLOWED_CHANNEL.split(',').map(id => id.trim()).filter(Boolean);
        }
        
        // Listen for message events
        client.on('messageCreate', this.handleMessage.bind(this));
        
        // Also listen for message delete events to clean up our tracking
        client.on('messageDelete', this.handleMessageDelete.bind(this));
        
        console.log(`[MOD] Module initialized with: notifications ${this.notificationsEnabled ? 'ON' : 'OFF'}, deletions ${this.deleteEnabled ? 'ON' : 'OFF'}`);
    },
    
    /**
     * Handle message deletion events to clean up our tracking
     * @param {Object} message - Deleted Discord message object
     */
    handleMessageDelete(message) {
        // Check if the deleted message is one of our moderation messages
        this.pendingModMessages.forEach((modMessage, channelId) => {
            if (modMessage.id === message.id) {
                console.log(`[MOD] Mod message ${message.id} was deleted in channel ${channelId}, cleaning up tracking`);
                this.pendingModMessages.delete(channelId);
            }
        });
    },
    
    /**
     * Handle incoming messages and check for Base64 content
     * @param {Object} message - Discord message object
     */
    async handleMessage(message) {
        // Debug logging for channel logic
        console.log('[MOD][DEBUG] allowedChannels:', this.allowedChannels, 'message.channelId:', message.channelId);
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Ignore messages from server admins
        if (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }
        
        // If ALLOWED_CHANNEL is set, skip moderation only in those channels
        if (this.allowedChannels && this.allowedChannels.length > 0) {
            if (this.allowedChannels.includes(message.channelId)) {
                console.log('[MOD][DEBUG] Skipping moderation for allowed channel:', message.channelId);
                return; // Allow codes in allowed channels
            } else {
                console.log('[MOD][DEBUG] Moderation enforced for channel:', message.channelId);
            }
        } else {
            console.log('[MOD][DEBUG] Moderation enforced for all channels (no allowedChannels set)');
        }
        // If ALLOWED_CHANNEL is not set, moderate everywhere (no early return)
        
        // Use the Base64 detector to check the message
        const scanResults = this.base64Detector.scanText(message.content);
        
        // If suspicious Base64 was found
        if (scanResults.length > 0) {
            console.log(`[MOD] Detected ${scanResults.length} suspicious Base64 patterns in message from ${message.author.tag} in #${message.channel.name || message.channelId}`);
            
            let messageDeleted = false;
            let notificationSent = false;
            
            try {
                // Delete the message if deletion is enabled
                if (this.deleteEnabled) {
                    await message.delete();
                    messageDeleted = true;
                    console.log(`[MOD] Deleted message from ${message.author.tag} in #${message.channel.name || message.channelId}`);
                } else {
                    console.log(`[MOD] Message deletion disabled, message from ${message.author.tag} was not deleted`);
                }
                
                // Send notification if enabled and not already one in this channel
                if (this.notificationsEnabled && !this.pendingModMessages.has(message.channelId)) {
                    // Create embed
                    const embed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('To keep it organized, please post invites on Twitter\n')
                        .setDescription(
                            'To make your codes visible to everyone, add this to your post:\n' +
                            '**`#Botanix2100 @BotanixLabs`**\n\n' +
                            '*Why?*\n' +
                            '✓ Prevents spam in Discord\n' +
                            '✓ Helps others find codes faster\n' +
                            '✓ Ensures fair access for all\n\n' +
                            '[Looking for invite codes? Check here!](https://x.com/search?q=%23Botanix2100%20%40BotanixLabs)'
                        )
                        .setImage('https://media.discordapp.net/attachments/1317881540176248904/1386310355067732029/2100logo_copy_3.png');
                    
                    // Send the embed and store the message reference
                    const sentMessage = await message.channel.send({ embeds: [embed] });
                    notificationSent = true;
                    console.log(`[MOD] Sent moderation message ${sentMessage.id} in #${message.channel.name || message.channelId}`);
                    
                    // Add to pending messages
                    this.pendingModMessages.set(message.channelId, sentMessage);
                    
                    // Delete after 2 minutes
                    setTimeout(async () => {
                        try {
                            // First check if the message still exists
                            if (this.pendingModMessages.has(message.channelId)) {
                                const modMessage = this.pendingModMessages.get(message.channelId);
                                
                                try {
                                    // Try to fetch the message to confirm it still exists
                                    await message.channel.messages.fetch(modMessage.id);
                                    // If fetch is successful, message exists and can be deleted
                                    await modMessage.delete();
                                    console.log(`[MOD] Auto-deleted moderation message after timeout in #${message.channel.name || message.channelId}`);
                                } catch (fetchError) {
                                    // Message doesn't exist anymore, just clean up our tracking
                                    console.log(`[MOD] Moderation message already deleted in #${message.channel.name || message.channelId}`);
                                }
                                
                                // Clean up our tracking regardless of whether delete succeeded
                                this.pendingModMessages.delete(message.channelId);
                            }
                        } catch (error) {
                            // Handle any other errors that might occur
                            console.error('[MOD] Error in moderation message cleanup:', error);
                            // Clean up our tracking anyway
                            this.pendingModMessages.delete(message.channelId);
                        }
                    }, 2 * 60 * 1000); // 2 minutes in milliseconds
                }
                
                // Log the event
                await this.logger.logEvent({
                    userId: message.author.id,
                    username: message.author.tag,
                    messageContent: message.content,
                    messageDeleted,
                    notificationSent,
                    channelId: message.channelId,
                    messageId: message.id
                });
                
            } catch (error) {
                console.error('[MOD] Error handling suspicious Base64 message:', error);
                
                // Still try to log the event even if there was an error
                try {
                    await this.logger.logEvent({
                        userId: message.author.id,
                        username: message.author.tag,
                        messageContent: message.content,
                        messageDeleted,
                        notificationSent,
                        channelId: message.channelId,
                        messageId: message.id,
                        error: error.message
                    });
                } catch (logError) {
                    console.error('[MOD] Error logging moderation event:', logError);
                }
            }
        }
    }
};