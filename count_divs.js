const fs = require('fs');
const content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');

let lines = content.split('\n');
let divCount = 0;
for (let i = 1530; i < 2015; i++) {
  let line = lines[i];
  let opens = (line.match(/<div/g) || []).length;
  let closes = (line.match(/<\/div>/g) || []).length;
  divCount += opens - closes;
  if (opens !== closes) {
    console.log('Line ' + (i + 1) + ': opens ' + opens + ', closes ' + closes + ', balance ' + divCount);
  }
}
