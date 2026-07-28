const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'MAPA_CIRURGICO_MEDLIFE.xlsx');
const workbook = xlsx.readFile(filePath);

const sheet = workbook.Sheets['052026'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

for (let r = 9; r < 20; r++) {
  const row = data[r] || [];
  console.log(`Row ${r}: Col11="${row[11] || ''}" Col12="${row[12] || ''}" Col13="${row[13] || ''}" Col14="${row[14] || ''}" Col15="${row[15] || ''}" Col16="${row[16] || ''}" Col17="${row[17] || ''}"`);
}
