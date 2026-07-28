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
    /<td style=\{\{ border: '1px solid #ccc', padding: '4px' \}\}>\{\(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| item\.attachment_url\) \? '✓' : ''\}<\/td>/g,
    "<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? '✓' : ''}</td>\n<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{(item.comanda_urls && item.comanda_urls.length > 0) ? '✓' : ''}</td>"
  );
  content = content.replace(
    /<td style=\{\{ border: '1px solid #ccc', padding: '4px' \}\}>\{\(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| !!item\.attachment_url\) \? '✓' : ''\}<\/td>/g,
    "<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{((item.medical_request_urls && item.medical_request_urls.length > 0) || !!item.attachment_url) ? '✓' : ''}</td>\n<td style={{ border: '1px solid #ccc', padding: '4px', textAlign: 'center' }}>{(item.comanda_urls && item.comanda_urls.length > 0) ? '✓' : ''}</td>"
  );

  // Excel Export Row
  content = content.replace(
    /'Anexo': \(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| item\.attachment_url\) \? 'Sim' : 'Não',/g,
    "'ANEXO 1': ((item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url) ? 'Sim' : 'Não',\n          'ANEXO 2': (item.comanda_urls && item.comanda_urls.length > 0) ? 'Sim' : 'Não',"
  );

  // Replace Anexo Indicador block exactly by parsing it.
  const oldBlock = `{/* Anexo Indicador */}
                      {isFieldVisible('attachment_url') && (
                        <td style={{ ...tdStyle, textAlign: 'center', padding: '0px 2px' }}>
                          {(() => {
                            const hasAtt = ((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url);
                            return (
                              <button 
                                className={\`checkbox-pill \${hasAtt ? 'active' : 'inactive'}\`}
                                disabled={true}
                                style={{ cursor: 'default' }}
                              >
                                {hasAtt ? <Check size={12} /> : <X size={12} />}
                                ANEXO
                              </button>
                            );
                          })()}
                        </td>
                      )}`;

  const newBlock = `{/* Anexo 1 Indicador */}
                      {isFieldVisible('attachment_url') && (
                        <td style={{ ...tdStyle, textAlign: 'center', padding: '0px 2px' }}>
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
                      )}
                      {/* Anexo 2 Indicador */}
                      {isFieldVisible('comanda_urls') && (
                        <td style={{ ...tdStyle, textAlign: 'center', padding: '0px 2px' }}>
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
                        </td>
                      )}`;

  // There are two occurrences of Anexo Indicador, one without isFieldVisible probably, let's just replace based on the standard pattern.
  // Wait, let's find the actual text in the file.
  
  const text1 = "{/* Anexo Indicador */}\n                      <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>\n                        {(() => {\n                          const hasAtt = ((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url);\n                          return (\n                            <button \n                              className={`checkbox-pill ${hasAtt ? 'active' : 'inactive'}`}\n                              disabled={true}\n                              style={{ cursor: 'default' }}\n                            >\n                              {hasAtt ? <Check size={12} /> : <X size={12} />}\n                              ANEXO\n                            </button>\n                          );\n                        })()}\n                      </td>";

  const newText1 = `{/* Anexo 1 Indicador */}
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

  // Actually, I'll use regex to match the td block to be safe.
  const regex = /\{\/\* Anexo Indicador \*\/\}[\s\S]*?ANEXO[\s\S]*?<\/button>\s*\);\s*\}\)\(\)\}\s*<\/td>/;
  content = content.replace(regex, newText1);
  
  fs.writeFileSync(path, content, 'utf8');
}

updateGrid('c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx');
updateGrid('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx');
