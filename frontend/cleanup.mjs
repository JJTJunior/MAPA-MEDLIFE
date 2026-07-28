import fs from 'fs';
import path from 'path';

const filePath = path.join('c:', 'MAPA MEDLIFE', 'frontend', 'src', 'components', 'SurgeryGrid.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove states
content = content.replace(/const \[selectedSheet.*?;\n/g, '');
content = content.replace(/const \[sheetNames.*?;\n/g, '');

// 2. Remove fetchSheetNames(); in useEffect
content = content.replace(/fetchSheetNames\(\);\n\s*/g, '');

// 3. Remove selectedSheet from dependency array
content = content.replace(/selectedSheet,\s*/g, '');

// 4. Remove fetchSheetNames function
content = content.replace(/const fetchSheetNames = async \(\) => {[\s\S]*?};\n\n/g, '');

// 5. Remove query.eq('sheet_name', selectedSheet)
content = content.replace(/\s*\/\/ 4\. Filtro de Competência\/Aba\s*if \(selectedSheet\) {[\s\S]*?}\s*/g, '\n');
content = content.replace(/\s*if \(selectedSheet\) query = query\.eq\('sheet_name', selectedSheet\);\s*/g, '\n');

// 6. Remove from exportData
content = content.replace(/,\s*'Competência': item\.sheet_name \|\| ''\s*/g, '');

// 7. Remove from dateHeader and getReportTitle
content = content.replace(/\s*} else if \(selectedSheet\) {[\s\S]*?selectedSheet\.substring\(2,6\)}`;\s*/g, '\n');

// 8. Remove the <select> for Mês/Ano
content = content.replace(/\s*<div>\s*<select[\s\S]*?Mês\/Ano<\/option>[\s\S]*?<\/select>\s*<\/div>\s*/g, '\n');

// 9. Remove from getPeriodText inline function
content = content.replace(/\s*if \(selectedSheet\) {[\s\S]*?}\s*/g, '\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('SurgeryGrid.jsx cleaned');
