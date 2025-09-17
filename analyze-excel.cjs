const XLSX = require('xlsx');
const fs = require('fs');

try {
    // Read the Excel file
    const filePath = 'attached_assets/Sample Data for VoterVault_1758119191170.xlsx';
    const workbook = XLSX.readFile(filePath);
    
    console.log('Excel File Analysis:');
    console.log('==================');
    console.log('Sheet names:', workbook.SheetNames);
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON to analyze structure
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length > 0) {
        console.log(`\nTotal rows: ${data.length}`);
        console.log(`Total columns: ${data[0].length}`);
        
        console.log('\nColumn headers:');
        data[0].forEach((header, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${header}`);
        });
        
        console.log('\nFirst 3 data rows:');
        for (let i = 0; i < Math.min(3, data.length); i++) {
            console.log(`Row ${i + 1}:`, data[i]);
        }
        
        // Show sample data in a more readable format
        console.log('\nSample records:');
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        jsonData.slice(0, 3).forEach((record, index) => {
            console.log(`\nRecord ${index + 1}:`);
            Object.entries(record).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });
        });
    }
    
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}