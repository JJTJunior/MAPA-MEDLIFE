const xlsx = require('xlsx');

function readExcel() {
  const filePath = 'C:\\Users\\jailt\\Downloads\\dados_validados.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
  console.log('Total rows:', data.length);
  console.log('Sample data (first 3 rows):');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
}

readExcel();
