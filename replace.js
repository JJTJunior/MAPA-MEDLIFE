const fs = require('fs');
let content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');
let scratch = fs.readFileSync('c:/Users/jailt/.gemini/antigravity-ide/brain/aab3d667-73bd-4a51-b121-bc1dc4d65057/scratch/modal_buttons_v2.jsx', 'utf8');
const start = content.indexOf('{(() => {\r\n                const imgFiles1 = shareModalData.files.filter(f => f.type.startsWith(\'image/\') && f.origin === \'anexo1\');');
const endString = '              )()}';
let end = content.indexOf(endString, start);
end = content.indexOf(endString, end + 1); // skip first block
end = end + endString.length; // end of second block
content = content.slice(0, start) + scratch + content.slice(end);
fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', content);
