/**
 * Bot state management for WL-bot
 * Handles runtime state including claim limits
 */

const fs = require('fs').promises;
const config = require('./config');
const messages = require('./messages');

class BotState {
    constructor(logger) {
        this.stateFile = config.paths.botStateFile;
        this.logger = logger || console.log;
        
        // Default state
        this.state = {
            claimLimit: 0, // Default: no codes claimable
            lastUpdated: config.system.currentDate,
            updatedBy: config.system.currentUser,
            csvLastModified: config.system.currentDate
        };
    }
    
    // Load state from file
    async load() {
        try {
            try {
                await fs.access(this.stateFile);
                const data = await fs.readFile(this.stateFile, 'utf8');
                const loadedState = JSON.parse(data);
                
                // Validate and load state
                if (loadedState && typeof loadedState === 'object') {
                    this.state = {
                        claimLimit: this.getValidNumber(loadedState.claimLimit, 0),
                        lastUpdated: loadedState.lastUpdated || config.system.currentDate,
                        updatedBy: loadedState.updatedBy || config.system.currentUser,
                        csvLastModified: loadedState.csvLastModified || config.system.currentDate
                    };
                    
                    this.logger(messages.system.botStateLoaded());
                } else {
                    await this.save(); // Save default state
                    this.logger('Invalid state format, using defaults', 'WARN');
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist yet, create with default values
                    await this.save();
                    this.logger(messages.system.botStateCreated());
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.logger(messages.system.botStateError(error), 'ERROR');
        }
    }
    
    // Save state to file
    async save() {
        try {
            // Update last modified timestamp
            this.state.lastUpdated = config.system.currentDate;
            this.state.updatedBy = config.system.currentUser;
            
            const data = JSON.stringify(this.state, null, 2); // Pretty format with 2 spaces
            await fs.writeFile(this.stateFile, data, 'utf8');
            this.logger(messages.system.botStateSaved());
            return true;
        } catch (error) {
            this.logger(messages.system.botStateError(error), 'ERROR');
            return false;
        }
    }
    
    // Helper to validate number properties
    getValidNumber(value, defaultValue) {
        return typeof value === 'number' && !isNaN(value) && value >= 0 ? value : defaultValue;
    }
    
    // Get current claim limit
    getClaimLimit() {
        return this.state.claimLimit;
    }
    
    // Increase the claim limit
    async increaseLimitBy(amount) {
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            return false;
        }
        
        this.state.claimLimit += amount;
        return await this.save();
    }
    
    // Check if more codes can be claimed
    canClaimMoreCodes(totalCodes, claimedCodes) {
        // If claim limit is 0, no codes can be claimed
        if (this.state.claimLimit === 0) {
            return false;
        }
        
        // Check if we've already reached the claim limit
        return claimedCodes < this.state.claimLimit && claimedCodes < totalCodes;
    }
    
    // Calculate codes available to claim
    getAvailableCodes(totalCodes, claimedCodes) {
        if (this.state.claimLimit === 0) {
            return 0;
        }
        
        // Available is the minimum of:
        // 1. Remaining codes in the database (total - claimed)
        // 2. Remaining codes allowed by limit (limit - claimed)
        const remainingInDb = Math.max(0, totalCodes - claimedCodes);
        const remainingInLimit = Math.max(0, this.state.claimLimit - claimedCodes);
        
        return Math.min(remainingInDb, remainingInLimit);
    }
    
    // Update CSV modified time
    async updateCsvModified() {
        this.state.csvLastModified = config.system.currentDate;
        return await this.save();
    }
    
    // Get CSV last modified
    getCsvLastModified() {
        return this.state.csvLastModified;
    }
    
    // Get last updated info
    getLastUpdateInfo() {
        return {
            date: this.state.lastUpdated,
            user: this.state.updatedBy
        };
    }
}

module.exports = BotState;