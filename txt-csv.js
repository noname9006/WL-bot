const fs = require('fs');
const path = require('path');

function detectAndConvertTxtToCsv() {
    try {
        // Read all files in the current directory
        const files = fs.readdirSync('./');
        
        // Find the first .txt file
        const txtFile = files.find(file => path.extname(file).toLowerCase() === '.txt');
        
        if (!txtFile) {
            console.log('No .txt file found in the root directory');
            return;
        }
        
        console.log(`Found txt file: ${txtFile}`);
        
        // Read the content of the txt file
        const content = fs.readFileSync(txtFile, 'utf8');
        
        // Split content into lines and filter out empty lines
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length === 0) {
            console.log('The txt file is empty');
            return;
        }
        
        // Create CSV content
        let csvContent = 'invite,userid\n';
        
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                // Add comma after the first column value, leave userid blank
                csvContent += `"${trimmedLine}",\n`;
            }
        });
        
        // Generate output filename
        const outputFilename = path.basename(txtFile, '.txt') + '.csv';
        
        // Write CSV file
        fs.writeFileSync(outputFilename, csvContent);
        
        console.log(`Successfully converted ${txtFile} to ${outputFilename}`);
        console.log(`Total rows converted: ${lines.length}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the conversion
detectAndConvertTxtToCsv();