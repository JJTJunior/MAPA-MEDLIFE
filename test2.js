const fs = require('fs');
let code = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('statusList.map')) {
    console.log('line ' + i + ':', lines[i]);
    console.log('line ' + (i+1) + ':', lines[i+1]);
    console.log('line ' + (i+2) + ':', lines[i+2]);
  }
}
