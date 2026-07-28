import fs from 'fs';
import path from 'path';

const filePath = path.join('c:', 'MAPA MEDLIFE', 'frontend', 'src', 'components', 'SurgeryGrid.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update handleDownloadTemplate
content = content.replace(
  /'C\\u00f3d\. Cirurgia': '12345',/,
  `'C\\u00f3d. Cirurgia': '12345',\n        'OPME (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'CME (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'BLOCO (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'P\\u00d3S (Sim/N\\u00e3o)': 'N\\u00e3o',`
);
content = content.replace(
  /'C\\u00f3d\. Cirurgia': '12345',/, // In case the first one didn't match unicode
  `'C\\u00f3d. Cirurgia': '12345',\n        'OPME (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'CME (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'BLOCO (Sim/N\\u00e3o)': 'N\\u00e3o',\n        'P\\u00d3S (Sim/N\\u00e3o)': 'N\\u00e3o',`
);

// Fallback replace for handleDownloadTemplate
if (!content.includes('OPME (Sim/N\\u00e3o)')) {
    content = content.replace(
      /'Cód\. Cirurgia': '12345',/,
      `'Cód. Cirurgia': '12345',\n        'OPME (Sim/Não)': 'Não',\n        'CME (Sim/Não)': 'Não',\n        'BLOCO (Sim/Não)': 'Não',\n        'PÓS (Sim/Não)': 'Não',`
    );
}


// Update handleFileUpload mapping
const rowsToInsertReplaceStr = `
          const opme_val = String(row['OPME (Sim/N\\u00e3o)'] || row['OPME (Sim/Não)'] || '').trim().toUpperCase();
          const cme_val = String(row['CME (Sim/N\\u00e3o)'] || row['CME (Sim/Não)'] || '').trim().toUpperCase();
          const bloco_val = String(row['BLOCO (Sim/N\\u00e3o)'] || row['BLOCO (Sim/Não)'] || '').trim().toUpperCase();
          const pos_val = String(row['P\\u00d3S (Sim/N\\u00e3o)'] || row['PÓS (Sim/Não)'] || '').trim().toUpperCase();

          rowsToInsert.push({
            opme_checked: opme_val === 'SIM',
            cme_checked: cme_val === 'SIM',
            bloco_checked: bloco_val === 'SIM',
            pos_checked: pos_val === 'SIM',`;

content = content.replace(
  /rowsToInsert\.push\(\{/,
  rowsToInsertReplaceStr
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Columns added to import template.');
