const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Total Rows:', data.length);
  if (data.length > 0) {
    console.log('Headers:', data[0]);
    console.log('Sample Rows (first 3):');
    data.slice(1, 4).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  }
});
