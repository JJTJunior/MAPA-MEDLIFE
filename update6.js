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

  const p1 = content.indexOf('{/* Anexos de Solicitação Médica / Autorização */}');
  const p2 = content.indexOf('{/* Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Observações */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    part1 = part1.replace(/isEditable \?/g, "(isEditable && isFieldEditable('attachment_url')) ?");
    part1 = part1.replace(/isEditable && \(/g, "(isEditable && isFieldEditable('attachment_url')) && (");
    part1 = part1.replace(/isEditable && showDeleteIcons && \(/g, "(isEditable && isFieldEditable('attachment_url')) && showDeleteIcons && (");
    part1 = part1.replace(/isEditable && showDeleteIcons \?/g, "(isEditable && isFieldEditable('attachment_url')) && showDeleteIcons ?");

    part2 = part2.replace(/isEditable \?/g, "(isEditable && isFieldEditable('comanda_urls')) ?");
    part2 = part2.replace(/isEditable && \(/g, "(isEditable && isFieldEditable('comanda_urls')) && (");
    part2 = part2.replace(/isEditable && showDeleteIconsComanda && \(/g, "(isEditable && isFieldEditable('comanda_urls')) && showDeleteIconsComanda && (");
    part2 = part2.replace(/isEditable && showDeleteIconsComanda \?/g, "(isEditable && isFieldEditable('comanda_urls')) && showDeleteIconsComanda ?");

    content = content.substring(0, p1) + part1 + part2 + content.substring(p3);
  }

  fs.writeFileSync(path, content, 'utf8');
}

function updateModal() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Titles
  content = content.replace(
    /<Image size=\{16\} \/> Solicitação Médica \/ Autorização/g,
    '<Image size={16} /> ANEXO 1 - Solicitação Médica / Autorização'
  );
  content = content.replace(
    /<Image size=\{16\} \/> Comanda \/ Documentação Cirúrgica/g,
    '<Image size={16} /> ANEXO 2 - Comanda / Documentação Cirúrgica'
  );

  const p1 = content.indexOf('{/* Seção de Anexos (Upload/Câmera) */}');
  const p2 = content.indexOf('{/* Seção de Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Seção de Observação */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    // Replace the button div with conditional rendering based on isFieldEditable
    part1 = part1.replace(
      /<div style=\{\{ display: 'flex', gap: '8px', alignItems: 'center' \}\}>/g,
      "{isFieldEditable('attachment_url') && (\n              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>"
    );
    // Find where the div closes. The upload block ends before `{/* Preview de Anexos Existentes */}`
    part1 = part1.replace(
      /\{\/\* Preview de Anexos Existentes \*\/\}/g,
      ")}\n            {/* Preview de Anexos Existentes */}"
    );
    // Also, handlePasteImages should be conditionally used
    part1 = part1.replace(/onPaste=\{handlePasteImages\}/g, "onPaste={isFieldEditable('attachment_url') ? handlePasteImages : undefined}");

    part2 = part2.replace(
      /<div style=\{\{ display: 'flex', gap: '8px', alignItems: 'center' \}\}>/g,
      "{isFieldEditable('comanda_urls') && (\n              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>"
    );
    part2 = part2.replace(
      /\{\/\* Preview de Anexos Existentes \*\/\}/g,
      ")}\n            {/* Preview de Anexos Existentes */}"
    );
    part2 = part2.replace(/onPaste=\{handlePasteComandaImages\}/g, "onPaste={isFieldEditable('comanda_urls') ? handlePasteComandaImages : undefined}");

    // Also need to conditionally render the trash icons for deletion
    // in part1: `onClick={() => removeMedicalRequestUrl(url)}`
    part1 = part1.replace(
      /<button\s+type="button"\s+onClick=\{\(\) => removeMedicalRequestUrl\(url\)\}/g,
      "{isFieldEditable('attachment_url') && (\n                          <button\n                            type=\"button\"\n                            onClick={() => removeMedicalRequestUrl(url)}"
    );
    part1 = part1.replace(
      /size=\{14\} \/>\s+<\/button>/g,
      "size={14} />\n                          </button>\n                        )}"
    );

    part2 = part2.replace(
      /<button\s+type="button"\s+onClick=\{\(\) => removeComandaUrl\(url\)\}/g,
      "{isFieldEditable('comanda_urls') && (\n                          <button\n                            type=\"button\"\n                            onClick={() => removeComandaUrl(url)}"
    );
    part2 = part2.replace(
      /size=\{14\} \/>\s+<\/button>/g,
      "size={14} />\n                          </button>\n                        )}"
    );

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
