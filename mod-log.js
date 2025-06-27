const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Moderation logging module to track and report violations
 */
class ModerationLogger {
    /**
     * Initialize the moderation logger
     * @param {Object} client - Discord client
     * @param {Object} options - Configuration options
     */
    constructor(client, options = {}) {
        this.client = client;
        this.logFile = options.logFile || path.join(process.cwd(), 'moderation-log.csv');
        this.violationsMap = new Map(); // Maps userIds to violation counts
        this.loadViolations();
    }

    /**
     * Load existing violations from CSV file
     */
    loadViolations() {
        try {
            if (fs.existsSync(this.logFile)) {
                const data = fs.readFileSync(this.logFile, 'utf8');
                const lines = data.split('\n').filter(line => line.trim());
                
                // Skip header row
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',');
                    if (parts.length >= 2) {
                        const userId = parts[0].trim();
                        // We don't use the count from the file directly,
                        // instead we count occurrences of this userId in the file
                        this.incrementViolation(userId, false); // false = don't write to file
                    }
                }
                console.log(`[MOD-LOG] Loaded violation data for ${this.violationsMap.size} users`);
            } else {
                // Create the CSV file with headers if it doesn't exist
                this.writeToCSV('userId,username,timestamp,messageContent,messageDeleted,notificationSent');
                console.log('[MOD-LOG] Created new moderation log file');
            }
        } catch (error) {
            console.error('[MOD-LOG] Error loading violations:', error);
        }
    }

    /**
     * Get the number of violations for a user
     * @param {string} userId - Discord user ID
     * @returns {number} - Number of violations
     */
    getUserViolations(userId) {
        return this.violationsMap.get(userId) || 0;
    }

    /**
     * Increment violation count for a user
     * @param {string} userId - Discord user ID
     * @param {boolean} saveToFile - Whether to save changes to file
     * @returns {number} - New violation count
     */
    incrementViolation(userId, saveToFile = true) {
        const currentCount = this.getUserViolations(userId);
        const newCount = currentCount + 1;
        this.violationsMap.set(userId, newCount);
        
        if (saveToFile) {
            this.saveViolations();
        }
        
        return newCount;
    }

    /**
     * Save violations map to file (not used directly, just for backup purposes)
     */
    saveViolations() {
        try {
            // We don't need to save the map separately as each violation is logged to CSV
            console.log(`[MOD-LOG] Violation counts updated for ${this.violationsMap.size} users`);
        } catch (error) {
            console.error('[MOD-LOG] Error saving violations:', error);
        }
    }

    /**
     * Write data to the CSV log file
     * @param {string} line - CSV line to write
     */
    writeToCSV(line) {
        try {
            fs.appendFileSync(this.logFile, line + '\n');
        } catch (error) {
            console.error('[MOD-LOG] Error writing to CSV:', error);
        }
    }

    /**
     * Escape a string for CSV format
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeCSV(str) {
        if (typeof str !== 'string') return '';
        
        // If string contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
    
    /**
     * Log a moderation event
     * @param {Object} data - Moderation event data
     * @returns {Promise<Object>} - Logging results
     */
    async logEvent(data) {
        try {
            const {
                userId,
                username,
                messageContent,
                messageDeleted = true,
                notificationSent = false,
                channelId,
                messageId
            } = data;
            
            // Check if parameters are valid
            if (!userId || !username) {
                console.error('[MOD-LOG] Missing required parameters for logging');
                return { success: false, error: 'Missing required parameters' };
            }
            
            // Increment violation count
            const violationCount = this.incrementViolation(userId);
            
            // Write to CSV
            const timestamp = new Date().toISOString();
            const csvLine = [
                this.escapeCSV(userId),
                this.escapeCSV(username),
                this.escapeCSV(timestamp),
                this.escapeCSV(messageContent || ''),
                messageDeleted ? 'yes' : 'no',
                notificationSent ? 'yes' : 'no'
            ].join(',');
            
            this.writeToCSV(csvLine);
            
            // If LOG_CHANNEL is set, send log to that channel
            const logChannelId = process.env.LOG_CHANNEL;
            if (logChannelId) {
                try {
                    const logChannel = await this.client.channels.fetch(logChannelId);
                    if (logChannel && logChannel.isTextBased()) {
                        const embed = new EmbedBuilder()
                            .setColor('#FF9900')
                            .setTitle('Moderation Action')
                            .setDescription(`Base64 invite code detected and action taken`)
                            .addFields(
                                { name: 'User', value: `${username} (${userId})`, inline: true },
                                { name: 'Violations', value: violationCount.toString(), inline: true },
                                { name: 'Channel', value: `<#${channelId}>`, inline: true },
                                { name: 'Message Deleted', value: messageDeleted ? 'Yes' : 'No', inline: true },
                                { name: 'Notification Sent', value: notificationSent ? 'Yes' : 'No', inline: true },
                                { name: 'Content', value: messageContent ? `\`\`\`\n${messageContent.slice(0, 1000)}\n\`\`\`` : '*No content*' }
                            )
                            .setTimestamp();
                            
                        await logChannel.send({ embeds: [embed] });
                        console.log(`[MOD-LOG] Sent log to channel ${logChannelId}`);
                    }
                } catch (error) {
                    console.error('[MOD-LOG] Error sending log to channel:', error);
                }
            }
            
            return { 
                success: true, 
                violationCount,
                logged: true,
                channelNotified: !!logChannelId
            };
        } catch (error) {
            console.error('[MOD-LOG] Error logging event:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

// Export the class directly
module.exports = ModerationLogger;