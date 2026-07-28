const fs = require('fs');
const diff = fs.readFileSync('C:/MAPA MEDLIFE/frontend/diff_recovered.txt', 'utf8');
const diffLines = diff.split('\n');
const restoredLines = [];
let inDiff = false;
for (let line of diffLines) {
  if (line.startsWith('@@')) { inDiff = true; continue; }
  if (line.startsWith('[diff_block_end]')) { inDiff = false; break; }
  if (inDiff && line.startsWith('-')) {
    let cleanLine = line.substring(1);
    if (cleanLine.endsWith('\r')) cleanLine = cleanLine.slice(0, -1);
    restoredLines.push(cleanLine);
  }
}
const curr = fs.readFileSync('C:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8').split('\n');
// Since some lines end in \r, we need to be careful
let insertIdx = curr.findIndex((l, i) => i > 800 && l.includes('boxShadow') && l.includes('0 2px 4px rgba(0,0,0,0.1)')) + 1;
if (insertIdx > 0) {
  curr.splice(insertIdx, 0, ...restoredLines);
  fs.writeFileSync('C:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', curr.join('\n'));
  console.log('Restored ' + restoredLines.length + ' lines at index ' + insertIdx);
} else {
  console.log('Could not find insert position');
}
