const fs = require('fs');

function updateGrid() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Full view header
  content = content.replace(
    /<th>Tipo de Cirurgia<\/th>/g,
    "<th>Tipo de Cirurgia</th>\n                    <th>Caráter</th>"
  );

  // Full view row
  content = content.replace(
    /<td><div style={{ fontSize: '0.85rem' }}>{surgery\.surgery_type \|\| '-'}<\/div><\/td>/g,
    "<td><div style={{ fontSize: '0.85rem' }}>{surgery.surgery_type || '-'}</div></td>\n                      <td><div style={{ fontSize: '0.85rem', fontWeight: '500', color: surgery.carater === 'URGÊNCIA' ? '#f87171' : (surgery.carater === 'JUDICIAL' ? '#c084fc' : '#64748b') }}>{surgery.carater || '-'}</div></td>"
  );

  // Spreadsheet view header
  content = content.replace(
    /{renderFilterableHeader\('Tipo de Cirurgia', 'surgery_type'\)}/g,
    "{renderFilterableHeader('Tipo de Cirurgia', 'surgery_type')}\n                    {renderFilterableHeader('Caráter', 'carater')}"
  );

  // Spreadsheet view row
  content = content.replace(
    /<td><div style={{ padding: '0 8px', fontSize: '0\.8rem', whiteSpace: 'nowrap' }}>{surgery\.surgery_type \|\| '-'}<\/div><\/td>/g,
    "<td><div style={{ padding: '0 8px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{surgery.surgery_type || '-'}</div></td>\n                          <td><div style={{ padding: '0 8px', fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: '500', color: surgery.carater === 'URGÊNCIA' ? '#f87171' : (surgery.carater === 'JUDICIAL' ? '#c084fc' : '#64748b') }}>{surgery.carater || '-'}</div></td>"
  );
  
  // Also fix the export map
  content = content.replace(
    /'Tipo de Cirurgia': item\.surgery_type \|\| '',/g,
    "'Tipo de Cirurgia': item.surgery_type || '',\n        'Caráter': item.carater || '',"
  );

  fs.writeFileSync(path, content, 'utf8');
}

function updateDetails() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Insert near surgery_type
  const searchHtml = `<div className="detail-item">
            <span className="detail-label">Tipo de Cirurgia:</span>
            <span className="detail-value">{surgery.surgery_type || '-'}</span>
          </div>`;
          
  const replaceHtml = `<div className="detail-item">
            <span className="detail-label">Tipo de Cirurgia:</span>
            <span className="detail-value">{surgery.surgery_type || '-'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Caráter:</span>
            <span className="detail-value" style={{ fontWeight: '500', color: surgery.carater === 'URGÊNCIA' ? '#ef4444' : (surgery.carater === 'JUDICIAL' ? '#a855f7' : 'inherit') }}>{surgery.carater || '-'}</span>
          </div>`;
          
  content = content.replace(searchHtml, replaceHtml);
  fs.writeFileSync(path, content, 'utf8');
}

updateGrid();
updateDetails();
