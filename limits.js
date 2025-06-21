/**
 * Limits module for WL-bot
 * Manages claim limits for invite codes
 */

const fs = require('fs').promises;
const config = require('./config');
const messages = require('./messages');

class ClaimLimits {
    constructor(logger) {
        this.limitsFile = config.paths.limitsFile;
        this.claimLimit = 0; // Default: no codes claimable
        this.logger = logger || console.log;
    }
    
    // Load claim limits from file
    async load() {
        try {
            try {
                await fs.access(this.limitsFile);
                const data = await fs.readFile(this.limitsFile, 'utf8');
                const limits = JSON.parse(data);
                
                if (typeof limits.claimLimit === 'number' && !isNaN(limits.claimLimit) && limits.claimLimit >= 0) {
                    this.claimLimit = limits.claimLimit;
                } else {
                    this.claimLimit = 0;
                    this.logger('Invalid claim limit format, resetting to 0', 'WARN');
                }
                
                this.logger(messages.system.limitsLoaded(this.claimLimit));
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // File doesn't exist yet, create with default values
                    this.claimLimit = 0;
                    await this.save();
                    this.logger('Limits file not found, created new file with default limit of 0');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.logger(messages.system.limitsError(error), 'ERROR');
            this.claimLimit = 0;
        }
    }
    
    // Save claim limits to file
    async save() {
        try {
            const data = JSON.stringify({
                claimLimit: this.claimLimit
            });
            await fs.writeFile(this.limitsFile, data, 'utf8');
            this.logger(messages.system.limitsSaved(this.claimLimit));
        } catch (error) {
            this.logger(messages.system.limitsError(error), 'ERROR');
            throw error;
        }
    }
    
    // Increase the claim limit
    async increaseLimitBy(amount) {
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            return false;
        }
        
        this.claimLimit += amount;
        await this.save();
        return true;
    }
    
    // Check if more codes can be claimed
    canClaimMoreCodes(totalCodes, claimedCodes) {
        // If claim limit is 0, no codes can be claimed
        if (this.claimLimit === 0) {
            return false;
        }
        
        // Check if we've already reached the claim limit
        return claimedCodes < this.claimLimit && claimedCodes < totalCodes;
    }
    
    // Get current claim limit
    getClaimLimit() {
        return this.claimLimit;
    }
    
    // Calculate codes available to claim
    getAvailableCodes(totalCodes, claimedCodes) {
        if (this.claimLimit === 0) {
            return 0;
        }
        
        // Available is the minimum of:
        // 1. Remaining codes in the database (total - claimed)
        // 2. Remaining codes allowed by limit (limit - claimed)
        const remainingInDb = Math.max(0, totalCodes - claimedCodes);
        const remainingInLimit = Math.max(0, this.claimLimit - claimedCodes);
        
        return Math.min(remainingInDb, remainingInLimit);
    }
}

module.exports = ClaimLimits;