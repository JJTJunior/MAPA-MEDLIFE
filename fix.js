const fs = require('fs');
let text = fs.readFileSync('c:/MAPA MEDLIFE/frontend/src/components/SettingsPage.jsx', 'utf8');

text = text.replace(/style=\{\{ width: '80px', padding: '0 10px', fontSize: '1\.2rem' \}\}\r?\n\s+<option/g, "style={{ width: '80px', padding: '0 10px', fontSize: '1.2rem' }}>\n                    <option");
text = text.replace(/style=\{\{ width: '60px', padding: '0 5px', fontSize: '1rem', height: '36px' \}\}\r?\n\s+<option/g, "style={{ width: '60px', padding: '0 5px', fontSize: '1rem', height: '36px' }}>\n                              <option");

fs.writeFileSync('c:/MAPA MEDLIFE/frontend/src/components/SettingsPage.jsx', text);
