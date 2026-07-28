const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Find which row looks like headers
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i] || [];
    if (row.some(cell => typeof cell === 'string' && (cell.includes('Paciente') || cell.includes('Médico')))) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex !== -1) {
    console.log(`\n--- Sheet: ${sheetName} (Header at ${headerRowIndex}) ---`);
    const valuesCol9 = new Set();
    const valuesCol10 = new Set();
    const valuesCol11 = new Set();
    const valuesCol12 = new Set();
    
    // We sample some rows to see what is there
    for (let r = headerRowIndex + 1; r < data.length; r++) {
      const row = data[r] || [];
      if (row[9] !== undefined) valuesCol9.add(row[9]);
      if (row[10] !== undefined) valuesCol10.add(row[10]);
      if (row[11] !== undefined) valuesCol11.add(row[11]);
      if (row[12] !== undefined) valuesCol12.add(row[12]);
    }
    
    console.log('  Col 9 unique values:', Array.from(valuesCol9).slice(0, 10));
    console.log('  Col 10 unique values:', Array.from(valuesCol10).slice(0, 10));
    console.log('  Col 11 unique values:', Array.from(valuesCol11).slice(0, 10));
    console.log('  Col 12 unique values:', Array.from(valuesCol12).slice(0, 10));
  }
});
