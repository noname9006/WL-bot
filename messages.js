/**
 * Message templates for WL-bot
 * Centralizes all user-facing messages for easier maintenance
 */

const messages = {
    // Messages for /2100 command (root "/" command)
    bitcoin2100: {
        // Ephemeral message when user uses /2100 command
        journey: () => 
            `They say you're looking for the road to Bitcoin City 2100…\nAre you ready for the next step?`,
            
        // Button clicked response
        buttonClicked: (username) => 
            `Welcome to the journey, ${username}! \nYour adventure begins now...`,
            
        // Error messages
        error: () => 
            `An error occurred while processing your journey request. Please try again later.`,
            
        channelRestricted: () => 
            `This command is not available in this channel.`
    },

    
    // Messages for admin commands
    admin: {
        notAuthorized: () => 
            `You do not have permission to use this command. Only guild administrators can use it.`,
        
        // Export command
        export: {
            fileNotFound: () => 
                `CSV file not found. No data to export.`,
                
            success: (timestamp, username, filename, lineCount) => 
                `📊 **CSV Export Generated**\n\`\`\`Exported on: ${timestamp} UTC\nRequested by: ${username}\nFilename: ${filename}\nData rows: ${lineCount}\`\`\``,
                
            error: () => 
                `An error occurred while exporting the CSV file. Please try again later.`
        },
        
        // Whitelist commands
        whitelist: {
            roleAdded: (role) => 
                `✅ Role **${role.name}** has been added to the whitelist.`,
                
            roleRemoved: (role) => 
                `❌ Role **${role.name}** has been removed from the whitelist.`,
                
            roleNotFound: () => 
                `❓ Role not found. Please mention a valid role.`,
                
            roleAlreadyWhitelisted: (role) => 
                `ℹ️ Role **${role.name}** is already whitelisted.`,
                
            roleNotWhitelisted: (role) => 
                `ℹ️ Role **${role.name}** is not on the whitelist.`,
                
            listEmpty: () => 
                `ℹ️ The whitelist is currently empty. Note: Server administrators always have access regardless of whitelist.`,
                
            listRoles: (roles) => 
                `📋 **Whitelisted Roles**:\n${roles.map(r => `- ${r}`).join('\n')}\n\nNote: Server administrators always have access regardless of whitelist.`,
                
            invalidCommand: () => 
                `❓ Invalid command. Use \`>WL @role\` to add a role or \`>WL rm @role\` to remove a role.`,
                
            error: () => 
                `❌ An error occurred while processing the whitelist command. Please try again later.`,
                
            limitError: () => 
                `❓ Invalid limit format. Use \`>wl set +<number>\` to increase the claim limit (e.g., \`>wl set +100\`).`,
                
            limitSet: (amount) => 
                `✅ Claim limit increased by **${amount}** codes.`,
                
            statsTitle: () => 
                `📊 Bot Status & Statistics`,
                
            statsDescription: (totalCodes, claimedCodes, claimLimit, availableCodes) => 
                `**Total Codes:** ${totalCodes}\n**Claimed Codes:** ${claimedCodes}\n**Claim Limit:** ${claimLimit}\n**Available for Claiming:** ${availableCodes}`,
                
            statsFooter: () => 
                `WL-bot Statistics`
        }
    },
    
    // System messages
    system: {
        startingBot: () => 
            `Starting WL-bot...`,
            
        startupComplete: (botUsername) => 
            `WL-bot started successfully as ${botUsername}`,
            
        loginFailed: (error) => 
            `Failed to login to Discord: ${error.message}`,
            
        shuttingDown: (signal) => 
            `Received ${signal}, shutting down gracefully...`,
            
        channelRestrictionActive: (channelCount, channelList) => 
            `Channel restriction active: Bot will only respond to /claim in ${channelCount} channel(s): ${channelList}`,
            
        noChannelRestriction: () => 
            `No channel restriction: Bot will respond to /claim in any channel`,
            
        slashCommandRegistrationStart: () => 
            `Registering slash commands...`,
            
        slashCommandRegistrationComplete: () => 
            `Slash commands registered successfully`,
            
        slashCommandRegistrationFailed: (error) => 
            `Failed to register slash commands: ${error.message}`,
            
        // Whitelist system messages
        whitelistLoaded: (count) => 
            `Whitelist loaded successfully: ${count} role(s) whitelisted`,
            
        whitelistSaved: (count) => 
            `Whitelist saved successfully: ${count} role(s) whitelisted`,
            
        whitelistError: (error) => 
            `Whitelist error: ${error.message}`,
            
        // Bot state system messages
        botStateLoaded: () => 
            `Bot state loaded successfully`,
            
        botStateSaved: () => 
            `Bot state saved successfully`,
            
        botStateError: (error) => 
            `Bot state error: ${error.message}`,
            
        botStateCreated: () => 
            `Bot state file not found, created new default state`
    }
};

module.exports = messages;