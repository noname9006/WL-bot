/**
 * Whitelist module for WL-bot
 * Manages role-based permissions for command access
 */

const fs = require('fs').promises;
const { PermissionFlagsBits } = require('discord.js');
const config = require('./config');
const messages = require('./messages');

class Whitelist {
    constructor(logger) {
        this.whitelistFile = config.paths.whitelistFile;
        this.whitelistedRoles = new Set(); // Store role IDs
        this.logger = logger || console.log;
    }
    
    // Load whitelisted roles from file
    async load() {
        try {
            try {
                await fs.access(this.whitelistFile);
                const data = await fs.readFile(this.whitelistFile, 'utf8');
                const roles = JSON.parse(data);
                
                if (Array.isArray(roles)) {
                    this.whitelistedRoles = new Set(roles);
                    this.logger(messages.system.whitelistLoaded(this.whitelistedRoles.size));
                } else {
                    this.whitelistedRoles = new Set();
                    this.logger('Invalid whitelist format, resetting to empty', 'WARN');
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist yet, create empty whitelist
                    this.whitelistedRoles = new Set();
                    await this.save();
                    this.logger('Whitelist file not found, created new empty whitelist');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.logger(messages.system.whitelistError(error), 'ERROR');
            this.whitelistedRoles = new Set();
        }
    }
    
    // Save whitelisted roles to file
    async save() {
        try {
            const data = JSON.stringify([...this.whitelistedRoles]);
            await fs.writeFile(this.whitelistFile, data, 'utf8');
            this.logger(messages.system.whitelistSaved(this.whitelistedRoles.size));
        } catch (error) {
            this.logger(messages.system.whitelistError(error), 'ERROR');
            throw error;
        }
    }
    
    // Add a role to the whitelist
    async addRole(roleId) {
        if (this.whitelistedRoles.has(roleId)) {
            return false; // Already whitelisted
        }
        
        this.whitelistedRoles.add(roleId);
        await this.save();
        return true;
    }
    
    // Remove a role from the whitelist
    async removeRole(roleId) {
        if (!this.whitelistedRoles.has(roleId)) {
            return false; // Not whitelisted
        }
        
        this.whitelistedRoles.delete(roleId);
        await this.save();
        return true;
    }
    
    // Check if a role is whitelisted
    isRoleWhitelisted(roleId) {
        return this.whitelistedRoles.has(roleId);
    }
    
    // Check if a member is allowed to use claim command
    // Member is allowed if:
    // 1. They have administrator permissions, OR
    // 2. They have at least one whitelisted role
    memberCanClaimCode(member) {
        // Admins are always whitelisted
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return true;
        }
        
        // Check for whitelisted roles if no admin permission
        if (this.whitelistedRoles.size === 0) {
            return false; // No roles whitelisted and not an admin
        }
        
        return member.roles.cache.some(role => this.whitelistedRoles.has(role.id));
    }
    
    // Get a list of all whitelisted role IDs
    getAllRoles() {
        return [...this.whitelistedRoles];
    }
}

module.exports = Whitelist;