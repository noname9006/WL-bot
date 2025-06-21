/**
 * Message templates for WL-bot
 * Centralizes all user-facing messages for easier maintenance
 */

const messages = {
    // Messages for /claim command
    claim: {
        // 1. When member uses / command, bot shows code and saves to CSV
        newUser: (username, inviteCode) => 
            `Hey @${username} welcome to the twentyone city\nYour invite code is: ${inviteCode}`,
            
        // 2. When member already has a code, welcome back message
        returningUser: (username, inviteCode) => 
            `Welcome back to the twentyone city @${username}\nYour invite code is: ${inviteCode}`,
            
        // 3. User is not eligible
        notEligible: () => 
            `Sorry, you're not yet eligible. Stay tuned and wait for announcements not to miss your turn.`,
            
        // Error and system messages
        channelRestricted: () => 
            `Not available in this channel`,
            
        processing: () => 
            `Please wait, another command is being processed...`,
            
        error: () => 
            `An error occurred while processing your request. Please try again later.`,
            
        noInvitesAvailable: () => 
            `There are no codes currently available, please wait for announcements or check later`,
            
        limitReached: () => 
            `There are no codes currently available, please wait for announcements or check later`
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
                `⚠️ An error occurred while updating the whitelist.`,
                
            limitSet: (amount) => 
                `✅ Claim limit increased by ${amount}. New codes are now available to claim.`,
                
            limitError: () => 
                `❓ Invalid limit format. Use \`>WL set +xxx\` where xxx is a number of codes to add.`,
                
            statsTitle: () => 
                `📊 Invite Codes Status`,
                
            statsDescription: (total, claimed, limit, available) => 
                `Total codes in database: **${total}**\nClaimed codes: **${claimed}**\nCurrent claim limit: **${limit}**\nCodes available to claim: **${available}**`,

            statsFooter: () => 
                `Use >WL set +xxx to increase the claim limit`
        }
    },
    
    // System messages for logging
    system: {
        startupComplete: (botTag) => 
            `Bot logged in as ${botTag}! Administrators have default access to claim codes.`,
            
        channelRestrictionActive: (count, channels) => 
            `Channel restriction active: ${count} channel(s) - ${channels}`,
            
        noChannelRestriction: () => 
            `Channel restriction: Server-wide access enabled`,
            
        slashCommandRegistrationStart: () => 
            `Starting slash command registration...`,
            
        slashCommandRegistrationComplete: () => 
            `Slash commands registered successfully`,
            
        slashCommandRegistrationFailed: (error) => 
            `Failed to register slash commands: ${error.message}`,
            
        startingBot: () => 
            `Starting Discord bot...`,
            
        loginFailed: (error) => 
            `Failed to login to Discord: ${error.message}`,
            
        shuttingDown: (signal) => 
            `Received ${signal} - Shutting down bot...`,
            
        whitelistLoaded: (count) => 
            `Whitelist loaded: ${count} role(s) - Administrators always have access`,
            
        whitelistSaved: (count) => 
            `Whitelist saved: ${count} role(s)`,
            
        whitelistError: (error) => 
            `Whitelist error: ${error.message}`,
            
        limitsLoaded: (limit) => 
            `Claim limits loaded: ${limit} codes claimable`,
            
        limitsSaved: (limit) => 
            `Claim limits saved: ${limit} codes claimable`,
            
        limitsError: (error) => 
            `Claim limits error: ${error.message}`
    }
};

module.exports = messages;