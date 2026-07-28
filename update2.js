const fs = require('fs');

function injectUI(path) {
  let content = fs.readFileSync(path, 'utf8');

  // We find the block starting with "{/* Anexos de Solicitação Médica / Autorização */}"
  // And it ends before "{/* Seção de OPME e CME */}" or "{/* Checkboxes (OPME, CME, etc) */}"
  
  const startMarker = '{/* Anexos de Solicitação Médica / Autorização */}';
  const startIndex = content.indexOf(startMarker);
  
  const nextSectionIndex = content.indexOf('{/* Observação */}');
  
  let block = content.substring(startIndex, nextSectionIndex);
  
  // Create Comanda block
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
    .replace(/document-input-details/g, 'document-input-comanda-details');

  content = content.slice(0, nextSectionIndex) + comandaBlock + content.slice(nextSectionIndex);
  fs.writeFileSync(path, content, 'utf8');
}

injectUI('c:/MAPA MEDLIFE/frontend/src/components/SurgeryDetails.jsx');
