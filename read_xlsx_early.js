const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = '102025';
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`\n--- Sheet: ${sheetName} ---`);
for (let i = 0; i < 15; i++) {
  console.log(`Row ${i}:`, data[i]);
}
