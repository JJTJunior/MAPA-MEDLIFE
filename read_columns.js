const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

const sheetName = '052026';
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

console.log(`\n--- Sheet: ${sheetName} ---`);
const headers = data[9];
const row = data[10];

for (let i = 0; i < Math.max(headers.length, row.length); i++) {
  console.log(`Col ${i}: Header="${headers[i] || ''}" | Val="${row[i] !== undefined ? row[i] : ''}"`);
}
