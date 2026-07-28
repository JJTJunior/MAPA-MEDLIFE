const fs = require('fs');

function updateGrid(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Headers
  content = content.replace(
    /<th style=\{\{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' \}\}>ANEXO<\/th>/g,
    "<th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 1</th>\n<th style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>ANEXO 2</th>"
  );
  content = content.replace(
    /<th style=\{\{ border: '1px solid #ccc', padding: '4px' \}\}>ANEXO<\/th>/g,
    "<th style={{ border: '1px solid #ccc', padding: '4px' }}>ANEXO 1</th>\n<th style={{ border: '1px solid #ccc', padding: '4px' }}>ANEXO 2</th>"
  );

  // PDF Export Row
  content = content.replace(
    /<td style=\{\{ border: '1px solid #ccc', padding: '4px' \}\}>\{\(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| \(item\.comanda_urls && item\.comanda_urls\.length > 0\) \|\| item\.attachment_url\) \? '✓' : ''\}<\/td>/g,
    "<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? '✓' : ''}</td>\n<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{(item.comanda_urls && item.comanda_urls.length > 0) ? '✓' : ''}</td>"
  );

  // Excel Export Row
  content = content.replace(
    /'Anexo': \(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| \(item\.comanda_urls && item\.comanda_urls\.length > 0\) \|\| item\.attachment_url\) \? 'Sim' : 'Não',/g,
    "'Anexo 1': ((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? 'Sim' : 'Não',\n          'Anexo 2': (item.comanda_urls && item.comanda_urls.length > 0) ? 'Sim' : 'Não',"
  );

  // Body cell (Anexo Indicador)
  const cellStart = content.indexOf('{/* Anexo Indicador */}');
  if (cellStart !== -1) {
    const nextSection = content.indexOf('{/* Observação */}');
    let cellBlock = content.substring(cellStart, nextSection);

    let replacement = `{/* Anexo 1 Indicador */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        {(() => {
                          const hasAtt1 = ((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url);
                          return (
                            <button 
                              className={\`checkbox-pill \${hasAtt1 ? 'active' : 'inactive'}\`}
                              disabled={true}
                              style={{ cursor: 'default' }}
                            >
                              {hasAtt1 ? <Check size={12} /> : <X size={12} />}
                              ANEXO 1
                            </button>
                          );
                        })()}
                      </td>
                      {/* Anexo 2 Indicador */}
                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                        {(() => {
                          const hasAtt2 = (surgery.comanda_urls && surgery.comanda_urls.length > 0);
                          return (
                            <button 
                              className={\`checkbox-pill \${hasAtt2 ? 'active' : 'inactive'}\`}
                              disabled={true}
                              style={{ cursor: 'default' }}
                            >
                              {hasAtt2 ? <Check size={12} /> : <X size={12} />}
                              ANEXO 2
                            </button>
                          );
                        })()}
                      </td>`;

    content = content.substring(0, cellStart) + replacement + '\n' + content.substring(nextSection);
  }

  fs.writeFileSync(path, content, 'utf8');
}

updateGrid('c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx');
updateGrid('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx');
