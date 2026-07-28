const fs = require('fs');
let content = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', 'utf8');
const newButtons = fs.readFileSync('C:/Users/jailt/.gemini/antigravity-ide/brain/aab3d667-73bd-4a51-b121-bc1dc4d65057/scratch/modal_buttons_v2.jsx', 'utf8');

const start = content.indexOf('{(() => {\r\n                const imgFiles1 = shareModalData.files.filter(f => f.type.startsWith(\'image/\') && f.origin === \'anexo1\');');
const endStr = 'Apenas Comanda / Documentauo</div>\r\n                  </div>\r\n                </button>\r\n              );})()}';
// Due to encoding issues, we'll just find );})()} after the second button
let end = content.indexOf(');})()}', start);
end = content.indexOf(');})()}', end + 1);

if (start !== -1 && end !== -1) {
  content = content.slice(0, start) + newButtons + '\r\n' + content.slice(end + ');})()}'.length);
  fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx', content);
  console.log('Success');
} else {
  console.log('Start or end not found', start, end);
}
