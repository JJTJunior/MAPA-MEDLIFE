const fs = require('fs');

function updateSpreadsheetMode() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx';
  let content = fs.readFileSync(path, 'utf8');

  const oldBlock = `<td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            {(() => {
                              const hasAtt = (surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url;
                              return (
                                <span style={{ color: hasAtt ? '#34d399' : 'var(--text-muted)' }}>
                                  {hasAtt ? '✓' : '—'}
                                </span>
                              );
                            })()}
                          </td>`;

  const newBlock = `<td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            {(() => {
                              const hasAtt1 = (surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || !!surgery.attachment_url;
                              return (
                                <span style={{ color: hasAtt1 ? '#34d399' : 'var(--text-muted)' }}>
                                  {hasAtt1 ? '✓' : '—'}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ textAlign: 'center', paddingLeft: '4px', paddingRight: '4px', width: '1%' }}>
                            {(() => {
                              const hasAtt2 = (surgery.comanda_urls && surgery.comanda_urls.length > 0);
                              return (
                                <span style={{ color: hasAtt2 ? '#34d399' : 'var(--text-muted)' }}>
                                  {hasAtt2 ? '✓' : '—'}
                                </span>
                              );
                            })()}
                          </td>`;

  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(path, content, 'utf8');
}

updateSpreadsheetMode();
