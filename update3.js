const fs = require('fs');

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
    /medical_request_urls: \(surgery\.medical_request_urls(.*?) : \(\[\],/g,
    `medical_request_urls: (surgery.medical_request_urls$1 : ([],
        comanda_urls: (surgery.comanda_urls && surgery.comanda_urls.length > 0) ? surgery.comanda_urls : [],`
  );
  content = content.replace(
    /medical_request_urls: \[\]/,
    `medical_request_urls: [], comanda_urls: []`
  );

  // Instead of duplicating all functions, let's add the comanda specific ones just before handleUpdateFileName or removeMedicalRequestUrl
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
      /const removeMedicalRequestUrl =/g,
      comandaFunctions + '\n  const removeMedicalRequestUrl ='
    );
  }

  // Also inside handleSubmit:
  // const payload = { ...formData, attachment_url: ... };
  // we don't need to do anything since comanda_urls is already in formData!
  // Wait, let's verify if `comanda_urls` is removed from formData before submitting? No, they submit formData usually.

  // Update title in UI
  content = content.replace(
    /Solicitação Médica \/ Autorização \/ Comanda - \(Anexos\)/g,
    'Solicitação Médica / Autorização'
  );

  // Now, clone the dropzone UI
  const startMarker = '{/* Seção de Anexos (Upload/Câmera) */}';
  const startIndex = content.indexOf(startMarker);
  
  if (startIndex !== -1) {
    const nextSectionIndex = content.indexOf('{/* Seção de Observação */}');
    
    let block = content.substring(startIndex, nextSectionIndex);
    
    // Create Comanda block
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
  
  fs.writeFileSync(path, content, 'utf8');
}

updateModal('c:/MAPA MEDLIFE/frontend/src/components/SurgeryModal.jsx');
