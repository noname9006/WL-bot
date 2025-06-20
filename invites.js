const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, PermissionFlagsBits, AttachmentBuilder, InteractionResponseType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class InviteBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages
            ]
        });

        this.csvFilePath = path.join(__dirname, 'invites.csv');
        this.isProcessing = false; // Flag to prevent concurrent processing
        
        // Parse multiple channel IDs from environment variable
        this.inviteChannelIds = this.parseChannelIds(process.env.INVITE_CHANNEL);
        
        this.setupEventHandlers();
    }

    // Enhanced logging utility with UTC timestamp
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
        console.log(`[${timestamp} UTC] [${level}] ${message}`);
    }

    parseChannelIds(channelEnv) {
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

    setupEventHandlers() {
        this.client.once('ready', () => {
            this.log(`Bot logged in as ${this.client.user.tag}!`);
            
            if (this.inviteChannelIds) {
                this.log(`Channel restriction active: ${this.inviteChannelIds.length} channel(s) - ${this.inviteChannelIds.join(', ')}`);
            } else {
                this.log('Channel restriction: Server-wide access enabled');
            }
            
            this.registerSlashCommands();
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            if (interaction.commandName === 'twentyone') {
                await this.handleTwentyOneCommand(interaction);
            } else if (interaction.commandName === 'export') {
                await this.handleExportCommand(interaction);
            }
        });

        // Enhanced error logging
        this.client.on('error', (error) => {
            this.log(`Discord client error: ${error.message}`, 'ERROR');
        });

        this.client.on('warn', (warning) => {
            this.log(`Discord client warning: ${warning}`, 'WARN');
        });
    }

    async registerSlashCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('twentyone')
                .setDescription('Get your invite code for twentyone city'),
            new SlashCommandBuilder()
                .setName('export')
                .setDescription('Export the invites CSV file (Admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ];

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            this.log('Starting slash command registration...');
            
            await rest.put(
                Routes.applicationCommands(this.client.user.id),
                { body: commands }
            );

            this.log('Slash commands registered successfully');
        } catch (error) {
            this.log(`Failed to register slash commands: ${error.message}`, 'ERROR');
        }
    }

    async handleExportCommand(interaction) {
        const userInfo = `${interaction.user.tag} (${interaction.user.id})`;
        const channelInfo = `channel ${interaction.channelId}`;
        
        this.log(`/export command initiated by ${userInfo} in ${channelInfo}`);

        try {
            // Double-check admin permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                this.log(`/export command denied: ${userInfo} lacks administrator permissions`, 'WARN');
                await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    flags: [64] // MessageFlags.Ephemeral
                });
                return;
            }

            await interaction.deferReply();
            this.log(`/export command authorized for ${userInfo}`);

            // Check if CSV file exists
            try {
                await fs.access(this.csvFilePath);
                this.log('CSV file access verified for export');
            } catch (error) {
                this.log(`CSV export failed: File not found at ${this.csvFilePath}`, 'ERROR');
                await interaction.editReply({
                    content: 'CSV file not found. No data to export.'
                });
                return;
            }

            // Read the CSV file
            const csvContent = await fs.readFile(this.csvFilePath, 'utf8');
            const lineCount = csvContent.split('\n').length - 1; // Subtract header
            this.log(`CSV file read successfully: ${lineCount} data rows`);
            
            // Create attachment with timestamp
            const currentDateTime = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `invites_export_${currentDateTime}.csv`;
            
            const attachment = new AttachmentBuilder(Buffer.from(csvContent, 'utf8'), {
                name: filename
            });

            await interaction.editReply({
                content: `📊 **CSV Export Generated**\n\`\`\`Exported on: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC\nRequested by: ${interaction.user.tag}\nFilename: ${filename}\nData rows: ${lineCount}\`\`\``,
                files: [attachment]
            });

            this.log(`CSV export completed: ${filename} sent to ${userInfo} (${lineCount} rows)`);

        } catch (error) {
            this.log(`CSV export error for ${userInfo}: ${error.message}`, 'ERROR');
            await interaction.editReply({
                content: 'An error occurred while exporting the CSV file. Please try again later.'
            });
        }
    }

    async handleTwentyOneCommand(interaction) {
        const userInfo = `${interaction.user.displayName || interaction.user.username} (${interaction.user.id})`;
        const channelInfo = `channel ${interaction.channelId}`;
        
        this.log(`/twentyone command initiated by ${userInfo} in ${channelInfo}`);

        // Check if command is used in the correct channel(s)
        if (this.inviteChannelIds && !this.inviteChannelIds.includes(interaction.channelId)) {
            this.log(`/twentyone command blocked: ${userInfo} used command in restricted ${channelInfo}`, 'WARN');
            await interaction.reply({
                content: 'Not available in this channel',
                flags: [64] // MessageFlags.Ephemeral
            });
            return;
        }

        // Check if another command is being processed
        if (this.isProcessing) {
            this.log(`/twentyone command queued: ${userInfo} - system busy`);
            await interaction.reply({
                content: 'Please wait, another command is being processed...',
                flags: [64] // MessageFlags.Ephemeral
            });
            return;
        }

        this.isProcessing = true;
        this.log(`/twentyone command processing started for ${userInfo}`);

        try {
            await interaction.deferReply({ flags: [64] }); // MessageFlags.Ephemeral

            const userId = interaction.user.id;
            const username = interaction.user.displayName || interaction.user.username;

            // Read and parse CSV file
            this.log(`Reading CSV file for ${userInfo}`);
            const csvData = await this.readCsvFile();
            this.log(`CSV data loaded: ${csvData.length} total records`);
            
            // Check if user already exists in CSV
            const existingUserRow = csvData.find(row => row.userid === userId);
            
            if (existingUserRow) {
                // User exists, send welcome back message
                this.log(`Returning user detected: ${userInfo} has existing invite ${existingUserRow.invite}`);
                await interaction.editReply({
                    content: `Welcome back to the twentyone city @${username}\nYour invite code is: ${existingUserRow.invite}`
                });
                this.log(`/twentyone completed: Existing invite ${existingUserRow.invite} provided to ${userInfo}`);
            } else {
                // User doesn't exist, find first available invite
                const availableInviteRow = csvData.find(row => !row.userid || row.userid.trim() === '');
                
                if (availableInviteRow) {
                    // Assign the invite to the user
                    const assignedInvite = availableInviteRow.invite;
                    availableInviteRow.userid = userId;
                    
                    this.log(`New user assignment: ${userInfo} assigned invite ${assignedInvite}`);
                    
                    // Update CSV file
                    await this.writeCsvFile(csvData);
                    this.log(`CSV file updated: User ${userId} linked to invite ${assignedInvite}`);
                    
                    await interaction.editReply({
                        content: `Hey @${username} welcome to the twentyone city\nYour invite code is: ${assignedInvite}`
                    });
                    
                    this.log(`/twentyone completed: New invite ${assignedInvite} assigned to ${userInfo}`);
                } else {
                    // No available invites
                    const assignedCount = csvData.filter(row => row.userid && row.userid.trim() !== '').length;
                    this.log(`/twentyone failed: No available invites remaining (${assignedCount}/${csvData.length} assigned) for ${userInfo}`, 'WARN');
                    
                    await interaction.editReply({
                        content: 'Sorry, no invite codes are currently available. Please contact an administrator.'
                    });
                }
            }
        } catch (error) {
            this.log(`/twentyone error for ${userInfo}: ${error.message}`, 'ERROR');
            await interaction.editReply({
                content: 'An error occurred while processing your request. Please try again later.'
            });
        } finally {
            this.isProcessing = false;
            this.log(`/twentyone processing completed for ${userInfo}`);
        }
    }

    async readCsvFile() {
        try {
            this.log(`Reading CSV file from ${this.csvFilePath}`);
            const fileContent = await fs.readFile(this.csvFilePath, 'utf8');
            const lines = fileContent.trim().split('\n');
            
            if (lines.length === 0) {
                this.log('CSV file is empty', 'WARN');
                return [];
            }

            // Parse header
            const headers = lines[0].split(',').map(header => header.trim());
            this.log(`CSV headers parsed: ${headers.join(', ')}`);
            
            // Parse data rows
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                data.push(row);
            }
            
            const assignedCount = data.filter(row => row.userid && row.userid.trim() !== '').length;
            const availableCount = data.length - assignedCount;
            this.log(`CSV file parsed successfully: ${data.length} total invites, ${assignedCount} assigned, ${availableCount} available`);
            
            return data;
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.log(`CSV file not found at ${this.csvFilePath}. Please create the file.`, 'ERROR');
                return [];
            }
            this.log(`CSV read error: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async writeCsvFile(data) {
        if (data.length === 0) {
            this.log('No data to write to CSV file', 'WARN');
            return;
        }

        try {
            this.log(`Writing CSV file with ${data.length} records`);
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => this.escapeCSVValue(row[header])).join(','))
            ].join('\n');

            await fs.writeFile(this.csvFilePath, csvContent, 'utf8');
            this.log(`CSV file updated successfully at ${this.csvFilePath}`);
        } catch (error) {
            this.log(`CSV write error: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    escapeCSVValue(value) {
        if (typeof value !== 'string') {
            value = String(value);
        }
        
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
    }

    async start() {
        try {
            this.log('Starting Discord bot...');
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            this.log(`Failed to login to Discord: ${error.message}`, 'ERROR');
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new InviteBot();
bot.start();

// Handle process termination
process.on('SIGINT', () => {
    bot.log('Received SIGINT - Shutting down bot...');
    bot.client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    bot.log('Received SIGTERM - Shutting down bot...');
    bot.client.destroy();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    bot.log(`Uncaught exception: ${error.message}`, 'ERROR');
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    bot.log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
});