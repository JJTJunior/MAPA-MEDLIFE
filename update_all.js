const fs = require('fs');

function updateDetails(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Add states
  if (!content.includes('const [uploadingComanda')) {
    content = content.replace(
      /const \[uploading, setUploading\] = useState\(false\);/,
      'const [uploading, setUploading] = useState(false);\n  const [uploadingComanda, setUploadingComanda] = useState(false);'
    );
  }
  if (!content.includes('const [showComandaDropdown')) {
    content = content.replace(
      /const \[showAttachmentDropdown, setShowAttachmentDropdown\] = useState\(false\);/,
      'const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);\n  const [showComandaDropdown, setShowComandaDropdown] = useState(false);'
    );
  }
  if (!content.includes('const [showDeleteIconsComanda')) {
    content = content.replace(
      /const \[showDeleteIcons, setShowDeleteIcons\] = useState\(false\);/,
      'const [showDeleteIcons, setShowDeleteIcons] = useState(false);\n  const [showDeleteIconsComanda, setShowDeleteIconsComanda] = useState(false);'
    );
  }

  // Update handleOutsideClick
  content = content.replace(
    /if \(!clickedMenu && !clickedPreviews\) \{\s*setShowAttachmentDropdown\(false\);\s*setShowDeleteIcons\(false\);\s*\}/,
    `if (!clickedMenu && !clickedPreviews) {
        setShowAttachmentDropdown(false);
        setShowDeleteIcons(false);
        setShowComandaDropdown(false);
        setShowDeleteIconsComanda(false);
      }`
  );
  content = content.replace(
    /\[showAttachmentDropdown, showDeleteIcons\]\)/,
    '[showAttachmentDropdown, showDeleteIcons, showComandaDropdown, showDeleteIconsComanda])'
  );

  if (!content.includes('const handleCameraComandaSelect')) {
    const comandaFunctions = `
  const handleCameraComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) { await uploadAndAddComandaFile(file, true); }
  };
  const handleGalleryComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) { await uploadAndAddComandaFile(file, true); }
  };
  const handleFileDocumentComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
        continue;
      }
      await uploadAndAddComandaFile(file, false);
    }
  };
  const handlePasteComandaImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) await uploadAndAddComandaFile(file, true);
      }
    }
  };
  const uploadAndAddComandaFile = async (file, shouldCompress = false) => {
    const displayName = prompt("Digite o nome/identificação para este anexo (ex: Comanda, Documentação):");
    const printName = displayName ? displayName.trim() : "";
    setUploadingComanda(true);
    try {
      let fileToUpload = file;
      if (shouldCompress && file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
      const fileName = \`comanda_\${Date.now()}_\${Math.floor(Math.random() * 100000)}.\${fileExt}\`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, fileToUpload);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
      const valueToStore = printName ? \`\${publicUrl}|||\${printName}\` : publicUrl;
      const updatedUrls = [...(localSurgery.comanda_urls || []), valueToStore];
      const { error: updateError } = await supabase.from('surgeries')
        .update({ comanda_urls: updatedUrls })
        .eq('id', localSurgery.id);
      if (updateError) throw updateError;
      setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));
      alert('SALVO COM SUCESSO');
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da imagem: ' + err.message);
    } finally {
      setUploadingComanda(false);
    }
  };
  const removeComandaUrl = async (itemToRemove) => {
    if (!window.confirm("Tem certeza que deseja remover este anexo?")) return;
    setUploadingComanda(true);
    try {
      const updatedUrls = (localSurgery.comanda_urls || []).filter(url => url !== itemToRemove);
      const filenameToDelete = extractFilename(itemToRemove);
      if (filenameToDelete) {
        await supabase.storage.from('attachments').remove([filenameToDelete]);
      }
      const { error: updateError } = await supabase.from('surgeries')
        .update({ comanda_urls: updatedUrls })
        .eq('id', localSurgery.id);
      if (updateError) throw updateError;
      setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));
      alert('Anexo removido com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao remover anexo: ' + err.message);
    } finally {
      setUploadingComanda(false);
    }
  };
  const handleUpdateComandaFileName = async (index, newName, url) => {
    const updatedUrls = [...(localSurgery.comanda_urls || [])];
    updatedUrls[index] = newName ? \`\${url}|||\${newName.trim()}\` : url;
    try {
      const { error: updateError } = await supabase.from('surgeries')
        .update({ comanda_urls: updatedUrls })
        .eq('id', localSurgery.id);
      if (updateError) throw updateError;
      setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar nome do anexo: ' + err.message);
    }
  };
`;
    // Insert before handleUpdateFileName (assumes only one occurrence or first one)
    content = content.replace(
      'const handleUpdateFileName = async',
      comandaFunctions + '\n  const handleUpdateFileName = async'
    );
  }

  // Update title
  content = content.replace(
    /Solicitação Médica \/ Autorização \/ Comanda - \(Anexos\)/g,
    'Solicitação Médica / Autorização'
  );

  // clone UI
  const startMarker = '{/* Anexos de Solicitação Médica / Autorização */}';
  const startIndex = content.indexOf(startMarker);
  
  if (startIndex !== -1) {
    const nextSectionIndex = content.indexOf('{/* Observações */}');
    
    if (nextSectionIndex !== -1) {
      let block = content.substring(startIndex, nextSectionIndex);
      
      let comandaBlock = block
        .replace(/{?\/\* Anexos de Solicitação Médica \/ Autorização \*\/}?/g, '{/* Anexos de Comanda / Documentação Cirúrgica */}')
        .replace(/Solicitação Médica \/ Autorização/g, 'Comanda / Documentação Cirúrgica')
        .replace(/handlePasteImages/g, 'handlePasteComandaImages')
        .replace(/uploading/g, 'uploadingComanda')
        .replace(/showAttachmentDropdown/g, 'showComandaDropdown')
        .replace(/setShowAttachmentDropdown/g, 'setShowComandaDropdown')
        .replace(/showDeleteIcons/g, 'showDeleteIconsComanda')
        .replace(/setShowDeleteIcons/g, 'setShowDeleteIconsComanda')
        .replace(/medical_request_urls/g, 'comanda_urls')
        .replace(/removeMedicalRequestUrl/g, 'removeComandaUrl')
        .replace(/handleUpdateFileName/g, 'handleUpdateComandaFileName')
        .replace(/handleCameraSelect/g, 'handleCameraComandaSelect')
        .replace(/handleGallerySelect/g, 'handleGalleryComandaSelect')
        .replace(/handleFileDocumentSelect/g, 'handleFileDocumentComandaSelect')
        .replace(/camera-input-details/g, 'camera-input-comanda-details')
        .replace(/gallery-input-details/g, 'gallery-input-comanda-details')
        .replace(/document-input-details/g, 'document-input-comanda-details')
        .replace(/details-attachment-menu-container/g, 'details-comanda-menu-container');

      content = content.slice(0, nextSectionIndex) + comandaBlock + content.slice(nextSectionIndex);
    }
  }

  fs.writeFileSync(path, content, 'utf8');
}


function updateModal(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Add states
  if (!content.includes('const [uploadingComanda')) {
    content = content.replace(
      /const \[uploading, setUploading\] = useState\(false\);/,
      'const [uploading, setUploading] = useState(false);\n  const [uploadingComanda, setUploadingComanda] = useState(false);'
    );
  }
  if (!content.includes('const [showComandaDropdown')) {
    content = content.replace(
      /const \[showAttachmentDropdown, setShowAttachmentDropdown\] = useState\(false\);/,
      'const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);\n  const [showComandaDropdown, setShowComandaDropdown] = useState(false);'
    );
  }

  // Update handleOutsideClick
  content = content.replace(
    /if \(!clickedMenu\) \{\s*setShowAttachmentDropdown\(false\);\s*\}/,
    `if (!clickedMenu) {
        setShowAttachmentDropdown(false);
        setShowComandaDropdown(false);
      }`
  );
  content = content.replace(
    /\[showAttachmentDropdown\]\)/,
    '[showAttachmentDropdown, showComandaDropdown])'
  );

  // In `useEffect` mapping `surgery`, we map `medical_request_urls`
  content = content.replace(
    /medical_request_urls: \(surgery\.medical_request_urls(.*?): \(\[\],/g,
    `medical_request_urls: (surgery.medical_request_urls$1: ([],
        comanda_urls: (surgery.comanda_urls && surgery.comanda_urls.length > 0) ? surgery.comanda_urls : [],`
  );
  
  if (!content.includes('comanda_urls: []')) {
    content = content.replace(
      /medical_request_urls: \[\]/,
      `medical_request_urls: [], comanda_urls: []`
    );
  }
  if (!content.includes('comanda_urls: [...(prev.comanda_urls')) {
    content = content.replace(
      /medical_request_urls: \[\.\.\.\(prev\.medical_request_urls \|\| \[\]\), valueToStore\]/g,
      `medical_request_urls: [...(prev.medical_request_urls || []), valueToStore], comanda_urls: [...(prev.comanda_urls || [])]`
    );
  }

  // Comanda specific functions
  if (!content.includes('const handleCameraComandaSelect')) {
    const comandaFunctions = `
  const handleCameraComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) { await uploadAndAddComandaFile(file, true); }
  };
  const handleGalleryComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) { await uploadAndAddComandaFile(file, true); }
  };
  const handleFileDocumentComandaSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
        continue;
      }
      await uploadAndAddComandaFile(file, false);
    }
  };
  const handlePasteComandaImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) await uploadAndAddComandaFile(file, true);
      }
    }
  };
  const uploadAndAddComandaFile = async (file, shouldCompress = false) => {
    const displayName = prompt("Digite o nome/identificação para este anexo (ex: Comanda, Documentação):");
    const printName = displayName ? displayName.trim() : "";
    setUploadingComanda(true);
    try {
      let fileToUpload = file;
      if (shouldCompress && file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
      const fileName = \`comanda_\${Date.now()}_\${Math.floor(Math.random() * 100000)}.\${fileExt}\`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, fileToUpload);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(fileName);
      const valueToStore = printName ? \`\${publicUrl}|||\${printName}\` : publicUrl;
      setFormData(prev => ({
        ...prev,
        comanda_urls: [...(prev.comanda_urls || []), valueToStore]
      }));
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da imagem: ' + err.message);
    } finally {
      setUploadingComanda(false);
    }
  };
  const removeComandaUrl = (urlToRemove) => {
    if (!window.confirm("Tem certeza que deseja remover este anexo?")) return;
    setFormData(prev => ({
      ...prev,
      comanda_urls: (prev.comanda_urls || []).filter(url => url !== urlToRemove)
    }));
  };
`;
    content = content.replace(
      'const removeMedicalRequestUrl =',
      comandaFunctions + '\n  const removeMedicalRequestUrl ='
    );
  }

  content = content.replace(
    /Solicitação Médica \/ Autorização \/ Comanda - \(Anexos\)/g,
    'Solicitação Médica / Autorização'
  );

  const startMarker = '{/* Seção de Anexos (Upload/Câmera) */}';
  const startIndex = content.indexOf(startMarker);
  
  if (startIndex !== -1) {
    const nextSectionIndex = content.indexOf('{/* Seção de Observação */}');
    if (nextSectionIndex !== -1) {
      let block = content.substring(startIndex, nextSectionIndex);
      let comandaBlock = block
        .replace(/{?\/\* Seção de Anexos \(Upload\/Câmera\) \*\/}?/g, '{/* Seção de Anexos de Comanda / Documentação Cirúrgica */}')
        .replace(/Solicitação Médica \/ Autorização/g, 'Comanda / Documentação Cirúrgica')
        .replace(/handlePasteImages/g, 'handlePasteComandaImages')
        .replace(/uploading/g, 'uploadingComanda')
        .replace(/showAttachmentDropdown/g, 'showComandaDropdown')
        .replace(/setShowAttachmentDropdown/g, 'setShowComandaDropdown')
        .replace(/medical_request_urls/g, 'comanda_urls')
        .replace(/removeMedicalRequestUrl/g, 'removeComandaUrl')
        .replace(/handleCameraSelect/g, 'handleCameraComandaSelect')
        .replace(/handleGallerySelect/g, 'handleGalleryComandaSelect')
        .replace(/handleFileDocumentSelect/g, 'handleFileDocumentComandaSelect')
        .replace(/camera-input/g, 'camera-input-comanda')
        .replace(/gallery-input/g, 'gallery-input-comanda')
        .replace(/document-input/g, 'document-input-comanda');

      content = content.slice(0, nextSectionIndex) + comandaBlock + content.slice(nextSectionIndex);
    }
  }

  fs.writeFileSync(path, content, 'utf8');
}


function updateGrid(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /\(\(item\.medical_request_urls && item\.medical_request_urls\.length > 0\) \|\| item\.attachment_url\)/g,
    '((item.medical_request_urls && item.medical_request_urls.length > 0) || (item.comanda_urls && item.comanda_urls.length > 0) || item.attachment_url)'
  );

  content = content.replace(
    /\(surgery\.medical_request_urls && surgery\.medical_request_urls\.length > 0\) \|\| !!surgery\.attachment_url/g,
    '((surgery.medical_request_urls && surgery.medical_request_urls.length > 0) || (surgery.comanda_urls && surgery.comanda_urls.length > 0) || !!surgery.attachment_url)'
  );

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

updateDetails('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx');
updateModal('c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx');
updateGrid('c:/MAPA MEDLIFE/frontend/src/components/SurgeryGrid.jsx');
updateGrid('c:/MAPA MEDLIFE/frontend/src/components/Dashboard.jsx');

