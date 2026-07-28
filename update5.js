const fs = require('fs');

function updateDetails() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Titles
  content = content.replace(
    /<ImageIcon size=\{20\} \/> Solicitação Médica \/ Autorização/g,
    '<ImageIcon size={20} /> ANEXO 1 - Solicitação Médica / Autorização'
  );
  content = content.replace(
    /<ImageIcon size=\{20\} \/> Comanda \/ Documentação Cirúrgica/g,
    '<ImageIcon size={20} /> ANEXO 2 - Comanda / Documentação Cirúrgica'
  );

  // We need to replace `isEditable` with `isFieldEditable('attachment_url')` in the first dropzone
  // and `isFieldEditable('comanda_urls')` in the second dropzone.
  // The first dropzone starts at {/* Anexos de Solicitação Médica / Autorização */}
  // The second starts at {/* Anexos de Comanda / Documentação Cirúrgica */}
  // The third section is {/* Observações */}

  const p1 = content.indexOf('{/* Anexos de Solicitação Médica / Autorização */}');
  const p2 = content.indexOf('{/* Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Observações */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    part1 = part1.replace(/isEditable \?/g, "isFieldEditable('attachment_url') ?");
    part1 = part1.replace(/isEditable &&/g, "isFieldEditable('attachment_url') &&");

    part2 = part2.replace(/isEditable \?/g, "isFieldEditable('comanda_urls') ?");
    part2 = part2.replace(/isEditable &&/g, "isFieldEditable('comanda_urls') &&");

    content = content.substring(0, p1) + part1 + part2 + content.substring(p3);
  }

  fs.writeFileSync(path, content, 'utf8');
}

function updateModal() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Add comanda_urls to formData initialization if needed? It's fine.

  // Titles
  content = content.replace(
    /> Solicitação Médica \/ Autorização/g,
    '> ANEXO 1 - Solicitação Médica / Autorização'
  );
  content = content.replace(
    /> Comanda \/ Documentação Cirúrgica/g,
    '> ANEXO 2 - Comanda / Documentação Cirúrgica'
  );

  // Modal might use `isFieldEditable('attachment_url')` or `isEditable`. Let's assume we can do the same.
  const p1 = content.indexOf('{/* Seção de Anexos (Upload/Câmera) */}');
  const p2 = content.indexOf('{/* Seção de Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Seção de Observação */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    // In modal, checking permissions is usually `!disabled && isFieldEditable(...)` or just `!disabled`?
    // Let's check what is used in part1
    part1 = part1.replace(/!disabled && isFieldEditable\('attachment_url'\) &&/g, "isFieldEditable('attachment_url') &&");
    part1 = part1.replace(/!disabled \?/g, "isFieldEditable('attachment_url') ?");
    part1 = part1.replace(/!disabled &&/g, "isFieldEditable('attachment_url') &&");

    part2 = part2.replace(/!disabled && isFieldEditable\('attachment_url'\) &&/g, "isFieldEditable('comanda_urls') &&");
    part2 = part2.replace(/!disabled \?/g, "isFieldEditable('comanda_urls') ?");
    part2 = part2.replace(/!disabled &&/g, "isFieldEditable('comanda_urls') &&");

    content = content.substring(0, p1) + part1 + part2 + content.substring(p3);
  }

  fs.writeFileSync(path, content, 'utf8');
}

function updateUserManagement() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/UserManagement.jsx';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(
    /\{ id: 'attachment_url', label: 'Anexo \(Upload\)' \},/g,
    "{ id: 'attachment_url', label: 'ANEXO 1 (Upload)' },\n    { id: 'comanda_urls', label: 'ANEXO 2 (Upload)' },"
  );

  fs.writeFileSync(path, content, 'utf8');
}

updateDetails();
updateModal();
updateUserManagement();
