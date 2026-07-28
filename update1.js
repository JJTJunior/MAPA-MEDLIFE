const fs = require('fs');

function updateFile(path) {
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
    /\]\);/g,
    (match, offset, str) => {
      // Very naive, let's just do string replacement
      return match;
    }
  );
  content = content.replace(
    /\[showAttachmentDropdown, showDeleteIcons\]\)/,
    '[showAttachmentDropdown, showDeleteIcons, showComandaDropdown, showDeleteIconsComanda])'
  );

  // Instead of duplicating all functions, let's add the comanda specific ones just before handleUpdateFileName
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
    content = content.replace(
      /const handleUpdateFileName = async/g,
      comandaFunctions + '\n  const handleUpdateFileName = async'
    );
  }

  // Update title
  content = content.replace(
    /Solicitação Médica \/ Autorização \/ Comanda - \(Anexos\)/g,
    'Solicitação Médica / Autorização'
  );

  // Now, clone the dropzone UI
  // I will just use regex to find the dropzone block and append a modified copy.
  // We can do this manually by reading the file and replacing the block.
  fs.writeFileSync(path, content, 'utf8');
}

updateFile('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx');
