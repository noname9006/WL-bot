/**
 * Configuration settings for WL-bot
 * Centralizes all configuration variables
 */

const path = require('path');

// Load environment variables
require('dotenv').config();

const config = {
    // Bot configuration
    bot: {
        token: process.env.DISCORD_TOKEN,
        intents: ['Guilds', 'GuildMessages', 'GuildMembers'],
        prefix: '>' // Command prefix for admin commands
    },
    
    // File paths
    paths: {
        csvFile: path.join(__dirname, 'invites.csv'),
        whitelistFile: path.join(__dirname, 'whitelist.json'), // Store whitelisted roles
        limitsFile: path.join(__dirname, 'limits.json') // Store claim limits and settings
    },
    
    // Channel configuration
    channels: {
        // Parse multiple channel IDs from environment variable
        inviteChannels: parseChannelIds(process.env.INVITE_CHANNEL)
    },
    
    // Commands configuration
    commands: {
        claim: {
            name: 'claim',
            description: 'Get your invite code'
        },
        
        admin: {
            // Admin commands with > prefix
            wl: {
                name: 'wl',
                description: 'Manage whitelist and claim limits'
            },
            wlRm: {
                name: 'wl rm',
                description: 'Remove a role from the whitelist'
            },
            wlSet: {
                name: 'wl set',
                description: 'Set claim limits'
            },
            wlCheck: {
                name: 'wl check',
                description: 'Check whitelist and claim limits'
            },
            export: {
                name: 'export',
                description: 'Export the invites CSV file'
            }
        }
    },
    
    // System settings
    system: {
        currentDate: '2025-06-21 16:22:26', // Current UTC date for reference
        dateTimeFormat: {
            log: {
                // Format: YYYY-MM-DD HH:MM:SS
                timestamp: () => new Date().toISOString().replace('T', ' ').slice(0, 19)
            },
            filename: {
                // Format: YYYY-MM-DD-HH-MM-SS (for filenames)
                timestamp: () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
            }
        }
    }
};

// Helper function to parse channel IDs from environment variable
function parseChannelIds(channelEnv) {
    if (!channelEnv || channelEnv.trim() === '') {
        return null; // No restriction
    }
    
    // Split by comma, trim whitespace, and filter out empty strings
    const channelIds = channelEnv
        .split(',')
        .map(id => id.trim())
        .filter(id => id !== '');
        
    return channelIds.length > 0 ? channelIds : null;
}

module.exports = config;