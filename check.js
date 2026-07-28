const { parse } = require('@babel/parser');
const fs = require('fs');
const code = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('No syntax errors!');
} catch (e) {
  console.error(e);
}
