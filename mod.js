const { EmbedBuilder } = require('discord.js');

/**
 * Discord moderation module for handling Base64 messages
 */
module.exports = {
    name: 'mod',
    description: 'Moderation module to handle Base64 messages',
    
    /**
     * Initialize the moderation module
     * @param {Object} client - Discord client
     */
    init(client) {
        // Store client reference
        this.client = client;
        
        // Track channels with pending moderation messages
        this.pendingModMessages = new Map();
        
        // Listen for message events
        client.on('messageCreate', this.handleMessage.bind(this));
    },
    
    /**
     * Handle incoming messages and check for Base64 content
     * @param {Object} message - Discord message object
     */
    async handleMessage(message) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Check if the message content contains Base64
        if (this.containsBase64(message.content)) {
            try {
                // Delete the message
                await message.delete();
                
                // Check if there's already a pending moderation message in this channel
                if (this.pendingModMessages.has(message.channelId)) return;
                
                // Create embed
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
                
                // Add to pending messages
                this.pendingModMessages.set(message.channelId, sentMessage);
                
                // Delete after 2 minutes
                setTimeout(async () => {
                    try {
                        await sentMessage.delete();
                        this.pendingModMessages.delete(message.channelId);
                    } catch (error) {
                        console.error('Error deleting moderation message:', error);
                        this.pendingModMessages.delete(message.channelId);
                    }
                }, 2 * 60 * 1000); // 2 minutes in milliseconds
            } catch (error) {
                console.error('Error handling Base64 message:', error);
            }
        }
    },
    
    /**
     * Check if a string potentially contains Base64 content
     * @param {string} content - Message content to check
     * @returns {boolean} - True if the content contains Base64 pattern
     */
    containsBase64(content) {
        if (!content || typeof content !== 'string') return false;
        
        // Basic Base64 pattern: Combination of A-Z, a-z, 0-9, +, /, and = at the end
        const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
        
        // Check if any part of the message matches Base64 pattern (min 16 chars to reduce false positives)
        const words = content.split(/\s+/);
        return words.some(word => word.length >= 16 && base64Pattern.test(word));
    }
};