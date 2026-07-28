const fs = require('fs');
const content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');
const oldButtons = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/old_buttons.jsx', 'utf8');
const newButtons = fs.readFileSync('C:/Users/jailt/.gemini/antigravity-ide/brain/aab3d667-73bd-4a51-b121-bc1dc4d65057/scratch/modal_buttons_v2.jsx', 'utf8');

// The newButtons had a small encoding issue when printing, but fs.readFileSync will read exactly what is there.
// However, the Anexo 1 • solicitação has special chars.
// We can just replace the string.
const updated = content.replace(oldButtons, newButtons);
if (updated !== content) {
  fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', updated);
  console.log('Success');
} else {
  console.log('Not found');
}
