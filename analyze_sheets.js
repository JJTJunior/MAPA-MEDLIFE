const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=================== Sheet: ${sheetName} ===================`);
  console.log(`Total Rows: ${data.length}`);
  
  // Find which row looks like headers (has 'Paciente' or 'Médico / Buco')
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i] || [];
    if (row.some(cell => typeof cell === 'string' && (cell.includes('Paciente') || cell.includes('Médico')))) {
      headerRowIndex = i;
      break;
    }
  }
  
  console.log(`Detected header row index: ${headerRowIndex}`);
  if (headerRowIndex !== -1) {
    const headers = data[headerRowIndex];
    console.log('Headers:');
    headers.forEach((h, idx) => {
      console.log(`  Col ${idx}: "${h || ''}"`);
    });
    
    // Sample row
    const sampleRow = data[headerRowIndex + 1] || [];
    console.log('Sample Row data:');
    sampleRow.forEach((val, idx) => {
      console.log(`  Col ${idx}: ${val !== undefined ? JSON.stringify(val) : ''}`);
    });
  } else {
    console.log('Could not detect header row in first 20 rows.');
    // Let's print the first 5 rows to see what is there
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`  Row ${i}:`, data[i]);
    }
  }
});
