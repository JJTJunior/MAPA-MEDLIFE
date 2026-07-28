const fs = require('fs');

function updateDetails() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Split states
  content = content.replace(
    /const \[isDropzoneFocused, setIsDropzoneFocused\] = useState\(false\);/g,
    "const [isDropzoneFocused1, setIsDropzoneFocused1] = useState(false);\n  const [isDropzoneFocused2, setIsDropzoneFocused2] = useState(false);"
  );

  const p1 = content.indexOf('{/* Anexos de Solicitação Médica / Autorização */}');
  const p2 = content.indexOf('{/* Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Observações */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    // Part 1 replacements
    part1 = part1.replace(/isDropzoneFocused/g, 'isDropzoneFocused1');
    part1 = part1.replace(/setIsDropzoneFocused/g, 'setIsDropzoneFocused1');
    part1 = part1.replace(
      /className="detail-section paste-dropzone"/g,
      "className={`detail-section ${(isEditable && isFieldEditable('attachment_url')) ? 'paste-dropzone' : ''}`}"
    );
    // Remove dashed styling if not editable
    part1 = part1.replace(
      /border: isDropzoneFocused1 \? '2px dashed var\(--primary-color, #10b981\)' : 'none',/g,
      "border: (isEditable && isFieldEditable('attachment_url') && isDropzoneFocused1) ? '2px dashed var(--primary-color, #10b981)' : ((isEditable && isFieldEditable('attachment_url')) ? '1px dashed var(--border-color, #cbd5e1)' : '1px solid var(--border-color, #e2e8f0)'),"
    );

    // Part 2 replacements
    part2 = part2.replace(/isDropzoneFocused/g, 'isDropzoneFocused2');
    part2 = part2.replace(/setIsDropzoneFocused/g, 'setIsDropzoneFocused2');
    part2 = part2.replace(
      /className="detail-section paste-dropzone"/g,
      "className={`detail-section ${(isEditable && isFieldEditable('comanda_urls')) ? 'paste-dropzone' : ''}`}"
    );
    part2 = part2.replace(
      /border: isDropzoneFocused2 \? '2px dashed var\(--primary-color, #10b981\)' : 'none',/g,
      "border: (isEditable && isFieldEditable('comanda_urls') && isDropzoneFocused2) ? '2px dashed var(--primary-color, #10b981)' : ((isEditable && isFieldEditable('comanda_urls')) ? '1px dashed var(--border-color, #cbd5e1)' : '1px solid var(--border-color, #e2e8f0)'),"
    );

    content = content.substring(0, p1) + part1 + part2 + content.substring(p3);
  }

  fs.writeFileSync(path, content, 'utf8');
}

function updateModal() {
  const path = 'c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx';
  let content = fs.readFileSync(path, 'utf8');

  // Split states
  content = content.replace(
    /const \[isDropzoneFocused, setIsDropzoneFocused\] = useState\(false\);/g,
    "const [isDropzoneFocused1, setIsDropzoneFocused1] = useState(false);\n  const [isDropzoneFocused2, setIsDropzoneFocused2] = useState(false);"
  );

  const p1 = content.indexOf('{/* Seção de Anexos (Upload/Câmera) */}');
  const p2 = content.indexOf('{/* Seção de Anexos de Comanda / Documentação Cirúrgica */}');
  const p3 = content.indexOf('{/* Seção de Observação */}');

  if (p1 !== -1 && p2 !== -1 && p3 !== -1) {
    let part1 = content.substring(p1, p2);
    let part2 = content.substring(p2, p3);

    // Part 1
    part1 = part1.replace(/isDropzoneFocused/g, 'isDropzoneFocused1');
    part1 = part1.replace(/setIsDropzoneFocused/g, 'setIsDropzoneFocused1');
    part1 = part1.replace(
      /className="paste-dropzone"/g,
      "className={isFieldEditable('attachment_url') ? 'paste-dropzone' : ''}"
    );
    part1 = part1.replace(
      /border: isDropzoneFocused1 \? '2px dashed var\(--primary-color, #10b981\)' : '2px dashed var\(--border-color, #e2e8f0\)',/g,
      "border: (isFieldEditable('attachment_url') && isDropzoneFocused1) ? '2px dashed var(--primary-color, #10b981)' : (isFieldEditable('attachment_url') ? '2px dashed var(--border-color, #e2e8f0)' : '1px solid var(--border-color, #e2e8f0)'),"
    );

    // Part 2
    part2 = part2.replace(/isDropzoneFocused/g, 'isDropzoneFocused2');
    part2 = part2.replace(/setIsDropzoneFocused/g, 'setIsDropzoneFocused2');
    part2 = part2.replace(
      /className="paste-dropzone"/g,
      "className={isFieldEditable('comanda_urls') ? 'paste-dropzone' : ''}"
    );
    part2 = part2.replace(
      /border: isDropzoneFocused2 \? '2px dashed var\(--primary-color, #10b981\)' : '2px dashed var\(--border-color, #e2e8f0\)',/g,
      "border: (isFieldEditable('comanda_urls') && isDropzoneFocused2) ? '2px dashed var(--primary-color, #10b981)' : (isFieldEditable('comanda_urls') ? '2px dashed var(--border-color, #e2e8f0)' : '1px solid var(--border-color, #e2e8f0)'),"
    );

    content = content.substring(0, p1) + part1 + part2 + content.substring(p3);
  }

  fs.writeFileSync(path, content, 'utf8');
}

updateDetails();
updateModal();
