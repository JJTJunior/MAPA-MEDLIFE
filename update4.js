const fs = require('fs');

function updateGrid(path) {
  let content = fs.readFileSync(path, 'utf8');

  // We want to replace conditions like:
  // (item.medical_request_urls && item.medical_request_urls.length > 0) || item.attachment_url
  // with
  // (item.medical_request_urls && item.medical_request_urls.length > 0) || (item.comanda_urls && item.comanda_urls.length > 0) || item.attachment_url

  content = content.replace(
    /\(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| item\.attachment_url\)/g,
    '((item.medical_request_urls && item.medical_request_urls.length > 0) || (item.comanda_urls && item.comanda_urls.length > 0) || item.attachment_url)'
  );

  content = content.replace(
    /\(surgery\.medical_request_urls && surgery\.medical_request_urls\.length > 0\) \|\| !!surgery\.attachment_url/g,
    '(surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || (surgery.comanda_urls && surgery.comanda_urls.length > 0) || !!surgery.attachment_url'
  );

  // Update text
  content = content.replace(
    /Enviar imagens - Solicitação Médica \/ Autorização \/ Comanda/g,
    'Enviar imagens - Anexos'
  );
  content = content.replace(
    /Enviar PDF - Solicitação Médica \/ Autorização \/ Comanda/g,
    'Enviar PDF - Anexos'
  );

  fs.writeFileSync(path, content, 'utf8');
}

updateGrid('c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx');
updateGrid('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx');
