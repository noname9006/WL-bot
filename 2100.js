// Silence the deprecation warning about ephemeral messages
process.env.NODE_NO_WARNINGS = '1';

const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    PermissionFlagsBits, 
    AttachmentBuilder, 
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// Import the config and modules
const config = require('./config');
const messages = require('./messages');
const Whitelist = require('./whitelist');
const BotState = require('./botstate');

class InviteBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.csvFilePath = config.paths.csvFile;
        this.isProcessing = false; // Flag to prevent concurrent processing
        
        // Get channel IDs from config
        this.inviteChannelIds = config.channels.inviteChannels;
        
        // Initialize whitelist and bot state
        this.whitelist = new Whitelist((...args) => this.log(...args));
        this.botState = new BotState((...args) => this.log(...args));
        
        this.setupEventHandlers();
    }

    // Enhanced logging utility with UTC timestamp
    log(message, level = 'INFO') {
        const timestamp = config.system.dateTimeFormat.log.timestamp();
        console.log(`[${timestamp} UTC] [${level}] ${message}`);
    }

    async setupEventHandlers() {
        // Load whitelist and bot state
        await this.whitelist.load();
        await this.botState.load();
        
        this.client.once('ready', () => {
            this.log(messages.system.startupComplete(this.client.user.tag));
            
            if (this.inviteChannelIds) {
                this.log(messages.system.channelRestrictionActive(
                    this.inviteChannelIds.length, 
                    this.inviteChannelIds.join(', ')
                ));
            } else {
                this.log(messages.system.noChannelRestriction());
            }
            
            this.registerSlashCommands();
        });

        // Handle slash commands and button interactions
        this.client.on('interactionCreate', async (interaction) => {
            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === config.commands.root.name) {
                    await this.handle2100Command(interaction);
                }
            } else if (interaction.isButton()) {
                if (interaction.customId === 'bitcoin_city_journey') {
                    await this.handleJourneyButton(interaction);
                }
            }
        });
        
        // Handle text-based admin commands
        this.client.on('messageCreate', async (message) => {
            // Ignore bot messages and messages that don't start with prefix
            if (message.author.bot || !message.content.startsWith(config.bot.prefix)) return;
            
            // Check if user has admin permissions
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                message.reply(messages.admin.notAuthorized());
                return;
            }
            
            const args = message.content.slice(config.bot.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            
            // Handle whitelist commands
            if (command === 'wl') {
                if (args.length === 0) {
                    // Basic whitelist list command
                    await this.handleWhitelistCommand(message, []);
                    return;
                }
                
                const subcommand = args[0].toLowerCase();
                
                if (subcommand === 'rm') {
                    // Handle remove role command
                    await this.handleWhitelistCommand(message, args);
                }
                else if (subcommand === 'set') {
                    // Handle set limit command
                    await this.handleSetLimitsCommand(message, args.slice(1));
                }
                else if (subcommand === 'check') {
                    // Handle check status command
                    await this.handleCheckCommand(message);
                }
                else {
                    // Assume it's a role mention for adding
                    await this.handleWhitelistCommand(message, args);
                }
            }
            // Handle export command
            else if (command === 'export') {
                await this.handleExportCommand(message);
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
                .setName(config.commands.root.name)
                .setDescription(config.commands.root.description)
        ];

        const rest = new REST({ version: '10' }).setToken(config.bot.token);

        try {
            this.log(messages.system.slashCommandRegistrationStart());
            
            await rest.put(
                Routes.applicationCommands(this.client.user.id),
                { body: commands }
            );

            this.log(messages.system.slashCommandRegistrationComplete());
        } catch (error) {
            this.log(messages.system.slashCommandRegistrationFailed(error), 'ERROR');
        }
    }

    async handle2100Command(interaction) {
        const userInfo = `${interaction.user.displayName || interaction.user.username} (${interaction.user.id})`;
        const channelInfo = `channel ${interaction.channelId}`;
        
        this.log(`/2100 command initiated by ${userInfo} in ${channelInfo}`);

        try {
            // Create the yellow button (using Secondary style which appears gray/neutral)
            const button = new ButtonBuilder()
                .setCustomId('bitcoin_city_journey')
                .setLabel('Take me there!')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🚀');

            const row = new ActionRowBuilder()
                .addComponents(button);

            // Create embed for the journey message - no timestamp
            const journeyEmbed = new EmbedBuilder()
                .setColor(0xFFD700)  // Gold color
                .setTitle('Bitcoin City 2100')
                .setDescription(messages.bitcoin2100.journey());

            // Send ephemeral message with embed and button
            await interaction.reply({
                embeds: [journeyEmbed],
                components: [row],
                ephemeral: true
            });

            this.log(`/2100 command completed for ${userInfo} - ephemeral message with button sent`);
        } catch (error) {
            this.log(`/2100 error for ${userInfo}: ${error.message}`, 'ERROR');
            
            // Error embed - no timestamp
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)  // Red color for error
                .setTitle('Error')
                .setDescription(messages.bitcoin2100.error());
                
            await interaction.reply({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    }

    async handleJourneyButton(interaction) {
        const userInfo = `${interaction.user.displayName || interaction.user.username} (${interaction.user.id})`;
        
        this.log(`Journey button clicked by ${userInfo}`);

        try {
            const username = interaction.user.displayName || interaction.user.username;
            
            // Create processing embed - no timestamp
            const processingEmbed = new EmbedBuilder()
                .setColor(0x3498DB)  // Blue color
                .setTitle('Processing')
                .setDescription(messages.bitcoin2100.buttonClicked(username));
            
            // First, update the original message to acknowledge button click
            await interaction.update({
                embeds: [processingEmbed],
                components: [] // Remove the button after clicking
            });

            this.log(`Journey button interaction acknowledged for ${userInfo}`);
            
            // Now proceed with claim logic in the same message context
            await this.processClaimInSameMessage(interaction);
        } catch (error) {
            this.log(`Journey button error for ${userInfo}: ${error.message}`, 'ERROR');
            
            // Error embed - no timestamp
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)  // Red color
                .setTitle('Error')
                .setDescription(messages.bitcoin2100.error());
                
            await interaction.followUp({
                embeds: [errorEmbed],
                ephemeral: true
            });
        }
    }

    // Process claims within the same message
    async processClaimInSameMessage(interaction) {
        const userInfo = `${interaction.user.displayName || interaction.user.username} (${interaction.user.id})`;
        const channelInfo = `channel ${interaction.channelId}`;
        
        this.log(`Claim processing initiated in same message from ${userInfo} in ${channelInfo}`);

        // Check if command is used in the correct channel(s)
        if (this.inviteChannelIds && !this.inviteChannelIds.includes(interaction.channelId)) {
            this.log(`Claim processing blocked: ${userInfo} used in restricted ${channelInfo}`, 'WARN');
            
            // Channel restriction embed - no timestamp
            const restrictionEmbed = new EmbedBuilder()
                .setColor(0xFF9900)  // Orange/amber for warning
                .setTitle('Channel Restricted')
                .setDescription(messages.claim.channelRestricted());
                
            await interaction.editReply({
                embeds: [restrictionEmbed],
                components: []
            });
            return;
        }
        
        // Check if user can claim code (admin or whitelisted role)
        if (!this.whitelist.memberCanClaimCode(interaction.member)) {
            this.log(`Claim processing denied: ${userInfo} doesn't have permission to claim codes`, 'WARN');
            
            // Not eligible embed - no timestamp
            // Create custom message with hyperlink
            const notEligibleMessage = "Sorry, you're not yet eligible. Stay tuned and wait for announcements not to miss your turn.\n\nMeanwhile, keep your eyes on [#Botanix2100 on Twitter](https://x.com/search?q=%23Botanix2100%20%40BotanixLabs&src=typed_query&f=top) — the door opens there";
            
            const notEligibleEmbed = new EmbedBuilder()
                .setColor(0xFF9900)  // Orange/amber for warning
                .setTitle('Not Eligible')
                .setDescription(notEligibleMessage);
                
            await interaction.editReply({
                embeds: [notEligibleEmbed],
                components: []
            });
            return;
        }

        // Check if another command is being processed
        if (this.isProcessing) {
            this.log(`Claim processing queued: ${userInfo} - system busy`);
            
            // Processing embed - no timestamp
            const processingEmbed = new EmbedBuilder()
                .setColor(0x3498DB)  // Blue color
                .setTitle('Processing')
                .setDescription(messages.claim.processing());
                
            await interaction.editReply({
                embeds: [processingEmbed],
                components: []
            });
            return;
        }

        this.isProcessing = true;
        this.log(`Claim processing started for ${userInfo}`);

        try {
            const userId = interaction.user.id;
            const username = interaction.user.displayName || interaction.user.username;

            // Read and parse CSV file
            this.log(`Reading CSV file for ${userInfo}`);
            const csvData = await this.readCsvFile();
            this.log(`CSV data loaded: ${csvData.length} total records`);
            
            // Calculate statistics for claim limits
            const totalCodes = csvData.length;
            const claimedCodes = csvData.filter(row => row.userid && row.userid.trim() !== '').length;
            
            // Check if user already exists in CSV
            const existingUserRow = csvData.find(row => row.userid === userId);
            
            if (existingUserRow) {
                // User exists, update the original message
                this.log(`Returning user detected: ${userInfo} has existing invite ${existingUserRow.invite}`);
                
                // Returning user embed - gold color with no timestamp
                const returningUserEmbed = new EmbedBuilder()
                    .setColor(0xFFD700)  // Gold color for returning users
                    .setTitle('Welcome Back')
                    .setDescription(messages.claim.returningUser(username, existingUserRow.invite));
                    
                await interaction.editReply({
                    embeds: [returningUserEmbed],
                    components: []
                });
                this.log(`Claim completed: Existing invite ${existingUserRow.invite} provided to ${userInfo}`);
            } else {
                // User doesn't exist, check if we can claim more codes
                if (!this.botState.canClaimMoreCodes(totalCodes, claimedCodes)) {
                    // Limit reached
                    this.log(`Claim failed: Claim limit reached (${claimedCodes}/${this.botState.getClaimLimit()} max) for ${userInfo}`, 'WARN');
                    
                    // Create embedded message for limit reached with hyperlink - no timestamp
                    const noCodesMessage = "There are no codes currently available, please wait for announcements or check later\n\nMeanwhile, keep your eyes on [#Botanix2100 on Twitter](https://x.com/search?q=%23Botanix2100%20%40BotanixLabs&src=typed_query&f=top) — the door opens there";
                    
                    const limitReachedEmbed = new EmbedBuilder()
                        .setColor(0xFF9900)  // Orange/amber for warning
                        .setTitle('Invite Codes Unavailable')
                        .setDescription(noCodesMessage);
                    
                    await interaction.editReply({
                        embeds: [limitReachedEmbed],
                        components: []
                    });
                    return;
                }
                
                // Find first available invite
                const availableInviteRow = csvData.find(row => !row.userid || row.userid.trim() === '');
                
                if (availableInviteRow) {
                    // Assign the invite to the user
                    const assignedInvite = availableInviteRow.invite;
                    availableInviteRow.userid = userId;
                    
                    this.log(`New user assignment: ${userInfo} assigned invite ${assignedInvite}`);
                    
                    // Update CSV file
                    await this.writeCsvFile(csvData);
                    
                    // Update CSV last modified in bot state
                    await this.botState.updateCsvModified();
                    
                    this.log(`CSV file updated: User ${userId} linked to invite ${assignedInvite}`);
                    
                    // New user embed - gold color with no timestamp
                    const newUserEmbed = new EmbedBuilder()
                        .setColor(0xFFD700)  // Gold color for new users
                        .setTitle('Welcome to the Journey')
                        .setDescription(messages.claim.newUser(username, assignedInvite));
                        
                    await interaction.editReply({
                        embeds: [newUserEmbed],
                        components: []
                    });
                    
                    this.log(`Claim completed: New invite ${assignedInvite} assigned to ${userInfo}`);
                } else {
                    // No available invites with hyperlink - no timestamp
                    this.log(`Claim failed: No available invites remaining (${claimedCodes}/${csvData.length} assigned) for ${userInfo}`, 'WARN');
                    
                    // Create embedded message for no invites with hyperlink
                    const noInvitesMessage = "There are no codes currently available, please wait for announcements or check later\n\nMeanwhile, keep your eyes on [#Botanix2100 on Twitter](https://x.com/search?q=%23Botanix2100%20%40BotanixLabs&src=typed_query&f=top) — the door opens there";
                    
                    const noInvitesEmbed = new EmbedBuilder()
                        .setColor(0xFF9900)  // Orange/amber for warning
                        .setTitle('Invite Codes Unavailable')
                        .setDescription(noInvitesMessage);
                    
                    await interaction.editReply({
                        embeds: [noInvitesEmbed],
                        components: []
                    });
                }
            }
        } catch (error) {
            this.log(`Claim error for ${userInfo}: ${error.message}`, 'ERROR');
            try {
                // Error embed - no timestamp
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)  // Red color
                    .setTitle('Error')
                    .setDescription(messages.claim.error());
                    
                await interaction.editReply({
                    embeds: [errorEmbed],
                    components: []
                });
            } catch (editError) {
                this.log(`Failed to edit reply: ${editError.message}`, 'ERROR');
            }
        } finally {
            this.isProcessing = false;
            this.log(`Claim processing completed for ${userInfo}`);
        }
    }
    
    async handleSetLimitsCommand(message, args) {
        const userInfo = `${message.author.tag} (${message.author.id})`;
        this.log(`>wl set command initiated by ${userInfo} in channel ${message.channelId}`);
        
        if (args.length === 0) {
            message.reply(messages.admin.whitelist.limitError());
            return;
        }
        
        // Get the first argument and check if it starts with +
        const limitArg = args[0];
        if (!limitArg.startsWith('+')) {
            message.reply(messages.admin.whitelist.limitError());
            return;
        }
        
        // Extract the number part
        const amountStr = limitArg.substring(1);
        const amount = parseInt(amountStr, 10);
        
        if (isNaN(amount) || amount <= 0) {
            message.reply(messages.admin.whitelist.limitError());
            return;
        }
        
        try {
            await this.botState.increaseLimitBy(amount);
            message.reply(messages.admin.whitelist.limitSet(amount));
            this.log(`Claim limit increased by ${amount} by ${userInfo}`);
        } catch (error) {
            this.log(`Claim limit update error: ${error.message}`, 'ERROR');
            message.reply(messages.admin.whitelist.error());
        }
    }
    
    async handleCheckCommand(message) {
        const userInfo = `${message.author.tag} (${message.author.id})`;
        this.log(`>wl check command initiated by ${userInfo} in channel ${message.channelId}`);
        
        try {
            // Get CSV data to calculate statistics
            const csvData = await this.readCsvFile();
            const totalCodes = csvData.length;
            const claimedCodes = csvData.filter(row => row.userid && row.userid.trim() !== '').length;
            const claimLimit = this.botState.getClaimLimit();
            const availableCodes = this.botState.getAvailableCodes(totalCodes, claimedCodes);
            
            // Get last update info
            const lastUpdate = this.botState.getLastUpdateInfo();
            
            // Get whitelisted roles
            const whitelistedRoleIds = this.whitelist.getAllRoles();
            let roleText = "No roles are currently whitelisted";
            
            if (whitelistedRoleIds && whitelistedRoleIds.length > 0) {
                // Get role names
                const roleNames = [];
                for (const roleId of whitelistedRoleIds) {
                    const role = message.guild.roles.cache.get(roleId);
                    if (role) {
                        roleNames.push(role.name);
                    } else {
                        roleNames.push(`Unknown Role (ID: ${roleId})`);
                    }
                }
                if (roleNames.length > 0) {
                    roleText = roleNames.map(name => `• ${name}`).join('\n');
                }
            }
            
            // Create an embedded message - no timestamp as requested
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(messages.admin.whitelist.statsTitle())
                .setDescription(messages.admin.whitelist.statsDescription(
                    totalCodes, 
                    claimedCodes, 
                    claimLimit,
                    availableCodes
                ));
                
            // Add fields with error checking
            try {
                embed.addFields(
                    { 
                        name: 'Whitelisted Roles', 
                        value: `${roleText}`, 
                        inline: false 
                    }
                );
            } catch (fieldError) {
                this.log(`Error adding fields to embed: ${fieldError.message}`, 'WARN');
                // Add a simpler field if there's an error
                embed.addFields(
                    { name: 'Status', value: 'Error formatting role information. Please check the server logs.', inline: false }
                );
            }
            
            embed.setFooter({ text: messages.admin.whitelist.statsFooter() });
            
            // Send the embed
            await message.reply({ embeds: [embed] });
            this.log(`Status check completed for ${userInfo}`);
        } catch (error) {
            this.log(`Status check error: ${error.message}`, 'ERROR');
            await message.reply(messages.admin.whitelist.error());
        }
    }
    
    async handleWhitelistCommand(message, args) {
        const userInfo = `${message.author.tag} (${message.author.id})`;
        this.log(`>wl command initiated by ${userInfo} in channel ${message.channelId}`);
        
        // Check if we have any arguments
        if (args.length === 0) {
            // List all whitelisted roles
            const whitelistedRoleIds = this.whitelist.getAllRoles();
            if (whitelistedRoleIds.length === 0) {
                message.reply(messages.admin.whitelist.listEmpty());
                return;
            }
            
            // Get role names
            const roleNames = [];
            for (const roleId of whitelistedRoleIds) {
                const role = message.guild.roles.cache.get(roleId);
                if (role) {
                    roleNames.push(role.name);
                } else {
                    roleNames.push(`Unknown Role (ID: ${roleId})`);
                }
            }
            
            message.reply(messages.admin.whitelist.listRoles(roleNames));
            return;
        }
        
        // Check for "rm" command to remove a role
        const isRemoveCommand = args[0].toLowerCase() === 'rm';
        if (isRemoveCommand) {
            args.shift(); // Remove the "rm" argument
        }
        
        // Check if there's a role mention
        const roleMention = message.mentions.roles.first();
        if (!roleMention) {
            message.reply(messages.admin.whitelist.roleNotFound());
            return;
        }
        
        try {
            if (isRemoveCommand) {
                // Remove role from whitelist
                const removed = await this.whitelist.removeRole(roleMention.id);
                if (removed) {
                    message.reply(messages.admin.whitelist.roleRemoved(roleMention));
                    this.log(`Role ${roleMention.name} (${roleMention.id}) removed from whitelist by ${userInfo}`);
                } else {
                    message.reply(messages.admin.whitelist.roleNotWhitelisted(roleMention));
                }
            } else {
                // Add role to whitelist
                const added = await this.whitelist.addRole(roleMention.id);
                if (added) {
                    message.reply(messages.admin.whitelist.roleAdded(roleMention));
                    this.log(`Role ${roleMention.name} (${roleMention.id}) added to whitelist by ${userInfo}`);
                } else {
                    message.reply(messages.admin.whitelist.roleAlreadyWhitelisted(roleMention));
                }
            }
        } catch (error) {
            this.log(`Whitelist command error: ${error.message}`, 'ERROR');
            message.reply(messages.admin.whitelist.error());
        }
    }

    async handleExportCommand(message) {
        const userInfo = `${message.author.tag} (${message.author.id})`;
        const channelInfo = `channel ${message.channelId}`;
        
        this.log(`>export command initiated by ${userInfo} in ${channelInfo}`);

        try {
            await message.reply('Processing export request...');
            
            // Check if CSV file exists
            try {
                await fs.access(this.csvFilePath);
                this.log('CSV file access verified for export');
            } catch (error) {
                this.log(`CSV export failed: File not found at ${this.csvFilePath}`, 'ERROR');
                await message.reply(messages.admin.export.fileNotFound());
                return;
            }

            // Read the CSV file
            const csvContent = await fs.readFile(this.csvFilePath, 'utf8');
            const lineCount = csvContent.split('\n').length - 1; // Subtract header
            this.log(`CSV file read successfully: ${lineCount} data rows`);
            
            // Create attachment with timestamp
            const currentDateTime = config.system.dateTimeFormat.filename.timestamp();
            const filename = `invites_export_${currentDateTime}.csv`;
            
            const attachment = new AttachmentBuilder(Buffer.from(csvContent, 'utf8'), {
                name: filename
            });

            await message.reply({
                content: messages.admin.export.success(
                    config.system.dateTimeFormat.log.timestamp(),
                    message.author.tag,
                    filename,
                    lineCount
                ),
                files: [attachment]
            });

            this.log(`CSV export completed: ${filename} sent to ${userInfo} (${lineCount} rows)`);

        } catch (error) {
            this.log(`CSV export error for ${userInfo}: ${error.message}`, 'ERROR');
            await message.reply(messages.admin.export.error());
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
            // Log Discord.js version
            const { version } = require('discord.js');
            this.log(`Using Discord.js version: ${version}`);
            
            this.log(messages.system.startingBot());
            await this.client.login(config.bot.token);
        } catch (error) {
            this.log(messages.system.loginFailed(error), 'ERROR');
            process.exit(1);
        }
    }
}

// Start the bot
const bot = new InviteBot();
bot.start();

// Handle process termination
process.on('SIGINT', () => {
    bot.log(messages.system.shuttingDown('SIGINT'));
    bot.client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    bot.log(messages.system.shuttingDown('SIGTERM'));
    bot.client.destroy();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    bot.log(`Uncaught exception: ${error.message}`, 'ERROR');
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    bot.log(`Unhandled rejection at: ${reason}`, 'ERROR');
});