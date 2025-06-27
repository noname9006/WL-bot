/**
 * Robust Base64 validator for detecting suspicious encoded strings
 * Handles obfuscation attempts like spaces, mixed case, etc.
 */
class SuspiciousBase64Detector {
    constructor() {
        // Your specific Base64 codes are 28 characters (27 + 1 padding)
        // and decode to exactly 20 bytes
        this.EXPECTED_LENGTH = 28;
        this.EXPECTED_DECODED_BYTES = 20;
        this.MIN_CHAR_TYPES = 3;
        this.MIN_UNIQUE_CHARS = 10;
    }

    /**
     * Main detection function
     * @param {string} text - Text to analyze
     * @returns {boolean} - True if suspicious Base64 detected
     */
    isSuspiciousBase64(text) {
        if (typeof text !== 'string' || !text.trim()) {
            return false;
        }

        // Step 1: Clean and basic pattern check
        const cleaned = this.cleanText(text);
        if (!this.matchesBasicPattern(cleaned)) {
            return false;
        }

        // Step 2: Entropy checks
        if (!this.hasGoodEntropy(cleaned)) {
            return false;
        }

        // Step 3: Valid Base64 with correct decoded length
        if (!this.isValidBase64WithCorrectLength(cleaned)) {
            return false;
        }

        return true;
    }

    /**
     * Remove all whitespace and normalize
     * @param {string} text 
     * @returns {string}
     */
    cleanText(text) {
        return text.replace(/\s+/g, '');
    }

    /**
     * Check if text matches basic Base64 pattern
     * @param {string} cleaned 
     * @returns {boolean}
     */
    matchesBasicPattern(cleaned) {
        // Must be exactly 28 characters: 27 Base64 chars + 1 padding
        if (cleaned.length !== this.EXPECTED_LENGTH) {
            return false;
        }

        // Must end with exactly one equals sign
        if (!cleaned.endsWith('=') || cleaned.endsWith('==')) {
            return false;
        }

        // Must contain only valid Base64 characters
        const base64Regex = /^[A-Za-z0-9+/]{27}=$/;
        return base64Regex.test(cleaned);
    }

    /**
     * Check if text has good entropy (character distribution)
     * @param {string} cleaned 
     * @returns {boolean}
     */
    hasGoodEntropy(cleaned) {
        const textWithoutPadding = cleaned.slice(0, -1); // Remove the '='
        
        // Count unique characters
        const uniqueChars = new Set(textWithoutPadding).size;
        if (uniqueChars < this.MIN_UNIQUE_CHARS) {
            return false;
        }

        // Count character types
        let uppercase = 0;
        let lowercase = 0;
        let digits = 0;
        let special = 0;

        for (const char of textWithoutPadding) {
            if (char >= 'A' && char <= 'Z') uppercase++;
            else if (char >= 'a' && char <= 'z') lowercase++;
            else if (char >= '0' && char <= '9') digits++;
            else if (char === '+' || char === '/') special++;
        }

        // Count how many character types are present
        const charTypes = [
            uppercase > 0,
            lowercase > 0,
            digits > 0,
            special > 0
        ].filter(Boolean).length;

        return charTypes >= this.MIN_CHAR_TYPES;
    }

    /**
     * Validate Base64 and check decoded length
     * @param {string} cleaned 
     * @returns {boolean}
     */
    isValidBase64WithCorrectLength(cleaned) {
        try {
            // Validate Base64 format
            if (!this.isValidBase64Format(cleaned)) {
                return false;
            }

            // Decode and check length
            const decoded = Buffer.from(cleaned, 'base64');
            return decoded.length === this.EXPECTED_DECODED_BYTES;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if string is valid Base64 format
     * @param {string} str 
     * @returns {boolean}
     */
    isValidBase64Format(str) {
        try {
            // Try to decode and re-encode to check validity
            const decoded = Buffer.from(str, 'base64');
            const reencoded = decoded.toString('base64');
            return reencoded === str;
        } catch (error) {
            return false;
        }
    }

    /**
     * Scan text for suspicious patterns
     * @param {string} text - Large text to scan
     * @returns {Array} - Array of detected suspicious strings
     */
    scanText(text) {
        const results = [];
        
        // Split by whitespace and newlines to get potential candidates
        const candidates = text.split(/[\s\n\r]+/);
        
        // Also look for patterns that might be split with spaces
        const spacedPattern = /[\sA-Za-z0-9+/]{25,35}=/g;
        const spacedMatches = text.match(spacedPattern) || [];
        
        // Combine all candidates
        const allCandidates = [...candidates, ...spacedMatches];
        
        for (const candidate of allCandidates) {
            if (this.isSuspiciousBase64(candidate)) {
                const cleaned = this.cleanText(candidate);
                if (!results.includes(cleaned)) {
                    results.push({
                        original: candidate,
                        cleaned: cleaned,
                        position: text.indexOf(candidate)
                    });
                }
            }
        }
        
        return results;
    }

    /**
     * Batch check multiple strings
     * @param {Array<string>} strings 
     * @returns {Array} - Results with detection status
     */
    batchCheck(strings) {
        return strings.map(str => ({
            text: str,
            isSuspicious: this.isSuspiciousBase64(str),
            cleaned: this.cleanText(str)
        }));
    }
}

// Fix the export - use proper CommonJS module export format
module.exports = SuspiciousBase64Detector;

// Run tests if this file is executed directly
if (require.main === module) {
    function runTests() {
        const detector = new SuspiciousBase64Detector();
        
        console.log('=== Testing Suspicious Base64 Detector ===\n');
        
        const testCases = [
            // Real codes from your file
            '32TBiqYUj3+Dcuc7r2qK5Y4otiU=',
            '+iTnEUnH3NTBIF6ZGcQw2iUV06g=',
            
            // Obfuscated real codes (should detect)
            '32TB iqYUj3+Dcuc7r2qK5Y4otiU=',
            '32TB i qYU j3+ Dcu c7r 2qK 5Y4 oti U=',
            
            // False positives (should NOT detect)
            'broooooooooooooooooooooooo=',
            'somewordwithlotsoflettters=',
            'SomewordWithlotsofle123ers=',
            'SomewordWith+/tsofle123ers=',
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
            
            // Edge cases
            'short=',
            'toolongtobeavalidbase64string=',
            '32TBiqYUj3+Dcuc7r2qK5Y4otiU==', // Double padding
            '32TBiqYUj3+Dcuc7r2qK5Y4otiU',   // No padding
        ];
        
        testCases.forEach((testCase, index) => {
            const result = detector.isSuspiciousBase64(testCase);
            console.log(`${(index + 1).toString().padStart(2)}. ${result ? '🚨' : '✅'} "${testCase}"`);
            console.log(`    Result: ${result ? 'SUSPICIOUS' : 'Safe'}\n`);
        });
        
        // Test text scanning
        console.log('=== Testing Text Scanning ===\n');
        const sampleText = `
        This is some normal text with a suspicious code hidden:
        32TBiqYUj3+Dcuc7r2qK5Y4otiU= and some more text.
        
        There might be spaced ones too: +iTn EUnH 3NTB IF6Z GcQw 2iUV 06g=
        
        But this should be ignored: somewordwithlotsoflettters=
        `;
        
        const scanResults = detector.scanText(sampleText);
        console.log('Scan results:', scanResults);
    }
    
    runTests();
}