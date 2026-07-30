import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, User, FileText, CheckCircle, Activity, Briefcase, Calendar, Image as ImageIcon, Upload, Trash2, MessageCircle, Paperclip, Share2, X, Edit, Save, EyeOff, ClipboardList, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';

const parsePrintUrl = (item) => {
  if (!item) return { url: '', name: '' };
  let cleanItem = item;
  if (cleanItem.startsWith('[ANEXO_3]|||')) {
    cleanItem = cleanItem.replace('[ANEXO_3]|||', '');
    if (!cleanItem.includes('?anexo=3')) {
      const parts = cleanItem.split('|||');
      if (parts[0]) parts[0] = parts[0] + '?anexo=3';
      cleanItem = parts.join('|||');
    }
  }
  if (cleanItem.includes('|||')) {
    const [url, ...nameParts] = cleanItem.split('|||');
    return { url, name: nameParts.join('|||') };
  }
  return { url: cleanItem, name: '' };
};

const isDocumentFile = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('|||')[0].split('?')[0].toLowerCase();
  return cleanUrl.endsWith('.pdf') || cleanUrl.endsWith('.doc') || cleanUrl.endsWith('.docx');
};

const extractFilename = (urlStr) => {
  if (!urlStr) return '';
  const urlWithoutPipe = urlStr.includes('|||') ? urlStr.split('|||')[0] : urlStr;
  const parts = urlWithoutPipe.split('/');
  return parts[parts.length - 1];
};

const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export default function SurgeryDetails({ surgery, onBack, onEdit, onUpdate, user }) {
  const [localSurgery, setLocalSurgery] = useState(surgery || {});

  const [uploading, setUploading] = useState(false);
  const [uploadingComanda, setUploadingComanda] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [showComandaDropdown, setShowComandaDropdown] = useState(false);
  const [isDropzoneFocused1, setIsDropzoneFocused1] = useState(false);
  const [isDropzoneFocused2, setIsDropzoneFocused2] = useState(false);
  const [showDeleteIcons, setShowDeleteIcons] = useState(false);
  const [showDeleteIconsComanda, setShowDeleteIconsComanda] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [shareModalData, setShareModalData] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({ anexo1: false, anexo2: false, anexo3: false });
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachmentNameInput, setAttachmentNameInput] = useState('');
  const [attachmentNameError, setAttachmentNameError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [pendingDeleteAttachment, setPendingDeleteAttachment] = useState(null);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [showDeleteIconsEquipment, setShowDeleteIconsEquipment] = useState(false);
  const [isDropzoneFocused3, setIsDropzoneFocused3] = useState(false);

  useEffect(() => {
    setLocalSurgery(surgery);
  }, [surgery]);

  useEffect(() => {
    if (!showAttachmentDropdown && !showDeleteIcons) return;

    const handleOutsideClick = (event) => {
      const menuEl = document.getElementById('details-attachment-menu-container');
      const previewsEl = document.getElementById('details-attachment-previews-container');

      const clickedMenu = menuEl && menuEl.contains(event.target);
      const clickedPreviews = previewsEl && previewsEl.contains(event.target);

      if (!clickedMenu && !clickedPreviews) {
        setShowAttachmentDropdown(false);
        setShowDeleteIcons(false);
        setShowComandaDropdown(false);
        setShowDeleteIconsComanda(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAttachmentDropdown, showDeleteIcons, showComandaDropdown, showDeleteIconsComanda]);

  if (!localSurgery) return null;

  const isEditable = user?.permissions?.can_view_only ? false : (user?.permissions?.can_edit ?? (user?.role === 'Admin' || user?.role === 'Gerente' || user?.role === 'TI' || user?.role === 'Administrativo' || user?.role === 'Diretoria'));

  const isFieldEditable = (fieldName) => {
    if (!isEditable) return false;
    if (!user?.permissions?.allowed_edit_fields) return true;
    return user.permissions.allowed_edit_fields.includes(fieldName);
  };

  // Lê a URL do anexo direto da nova coluna do banco de dados
  let attachedImageUrl = localSurgery.attachment_url || null;

  const handleCameraSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, false);
    e.target.value = '';
  };

  const handleGallerySelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, false);
    e.target.value = '';
  };

  const handleFileDocumentSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
      e.target.value = '';
      return;
    }
    requestAttachmentName(pdfs, false, false);
    e.target.value = '';
  };

  const handleCameraComandaSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, true);
    e.target.value = '';
  };

  const handleGalleryComandaSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, true);
    e.target.value = '';
  };

  const handleFileDocumentComandaSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
      e.target.value = '';
      return;
    }
    requestAttachmentName(pdfs, false, true);
    e.target.value = '';
  };

  const handlePasteImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          uploadAndAddFile(file, true);
        }
      }
    }
  };

  const handlePasteComandaImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          uploadAndAddComandaFile(file, true);
        }
      }
    }
  };

  const handlePrintOptionClick = async (isComanda = false) => {
    setShowAttachmentDropdown(false);
    setShowComandaDropdown(false);

    if (navigator.clipboard && navigator.clipboard.read) {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `print_${Date.now()}.png`, { type: imageType });
            if (isComanda) {
              await uploadAndAddComandaFile(file, true);
            } else {
              await uploadAndAddFile(file, true);
            }
            return;
          }
        }
      } catch (err) {
        console.log('Clipboard read error or denied:', err);
      }
    }

    const dropzoneId = isComanda ? 'anexo2-dropzone' : 'anexo1-dropzone';
    const el = document.getElementById(dropzoneId);
    if (el) {
      el.focus();
    }
  };

  useEffect(() => {
    const handleGlobalPaste = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            if (isDropzoneFocused2) {
              uploadAndAddComandaFile(file, true);
            } else {
              uploadAndAddFile(file, true);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isDropzoneFocused2, localSurgery]);

  const requestAttachmentName = (files, shouldCompress, isComanda) => {
    const fileList = Array.isArray(files) ? files : Array.from(files);
    if (!fileList || fileList.length === 0) return;
    setAttachmentNameInput('');
    setAttachmentNameError('');
    setPendingAttachment({ files: fileList, shouldCompress, isComanda });
  };

  const uploadAndAddFile = (file, shouldCompress = false) => {
    requestAttachmentName([file], shouldCompress, false);
  };

  const processMedicalRequestBatchUpload = async (files, shouldCompress, baseName) => {
    setUploading(true);
    setUploadProgress({
      current: 0,
      total: files.length,
      fileName: baseName,
      percent: 5,
      status: `Preparando ${files.length} arquivo(s)...`,
      isDone: false
    });

    try {
      const newValuesToStore = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const displayName = files.length > 1 ? `${baseName} (${i + 1})` : baseName;
        const currentPercent = Math.round((i / files.length) * 85) + 5;

        setUploadProgress({
          current: i + 1,
          total: files.length,
          fileName: displayName,
          percent: currentPercent,
          status: `Enviando arquivo ${i + 1} de ${files.length}...`,
          isDone: false
        });

        let fileToUpload = file;
        if (shouldCompress && file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }

        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
        const fileName = `medical_request_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const valueToStore = displayName ? `${publicUrl}|||${displayName}` : publicUrl;
        newValuesToStore.push(valueToStore);
      }

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Atualizando registro...',
        percent: 95,
        status: 'Salvando alterações no prontuário...',
        isDone: false
      });

      setLocalSurgery(prev => {
        const existingUrls = prev.medical_request_urls || [];
        const updatedUrls = [...existingUrls, ...newValuesToStore];
        const firstAttachmentUrl = updatedUrls.length > 0 ? (updatedUrls[0].includes('|||') ? updatedUrls[0].split('|||')[0] : updatedUrls[0]) : null;

        supabase.from('surgeries')
          .update({ medical_request_urls: updatedUrls, attachment_url: firstAttachmentUrl })
          .eq('id', prev.id)
          .then(({ error }) => {
            if (error) console.error('Erro ao atualizar banco:', error);
          });

        const nextObj = {
          ...prev,
          medical_request_urls: updatedUrls,
          attachment_url: firstAttachmentUrl
        };
        if (onUpdate) onUpdate(nextObj);
        return nextObj;
      });

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Concluído!',
        percent: 100,
        status: 'Todos os anexos foram enviados com sucesso!',
        isDone: true
      });

      setTimeout(() => {
        setUploadProgress(null);
      }, 1200);

    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload dos anexos: ' + err.message);
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const removeMedicalRequestUrl = async (itemToRemove) => {
    setUploading(true);
    const previousUrls = localSurgery.medical_request_urls;
    const previousFirstUrl = localSurgery.attachment_url;
    try {
      const updatedUrls = (localSurgery.medical_request_urls || []).filter(url => url !== itemToRemove);
      const firstAttachmentUrl = updatedUrls.length > 0 ? (updatedUrls[0].includes('|||') ? updatedUrls[0].split('|||')[0] : updatedUrls[0]) : null;

      setLocalSurgery(prev => ({
        ...prev,
        medical_request_urls: updatedUrls,
        attachment_url: firstAttachmentUrl
      }));

      const filenameToDelete = extractFilename(itemToRemove);
      if (filenameToDelete) {
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([filenameToDelete]);
        if (storageError) console.error('Erro ao excluir arquivo no storage:', storageError);
      }

      const { error: updateError } = await supabase.from('surgeries')
        .update({ medical_request_urls: updatedUrls, attachment_url: firstAttachmentUrl })
        .eq('id', localSurgery.id);

      if (updateError) throw updateError;
    } catch (err) {
      console.error(err);
      alert('Erro ao remover anexo: ' + err.message);
      setLocalSurgery(prev => ({
        ...prev,
        medical_request_urls: previousUrls,
        attachment_url: previousFirstUrl
      }));
    } finally {
      setUploading(false);
    }
  };

  
  const handleCameraEquipmentSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, 'equipment');
    e.target.value = '';
  };

  const handleGalleryEquipmentSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) requestAttachmentName(files, true, 'equipment');
    e.target.value = '';
  };

  const handleFileDocumentEquipmentSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) {
      alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
      e.target.value = '';
      return;
    }
    requestAttachmentName(pdfs, false, 'equipment');
    e.target.value = '';
  };

  const handlePasteEquipmentImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) await requestAttachmentName([file], true, 'equipment');
      }
    }
  };

  const processEquipmentBatchUpload = async (files, shouldCompress, baseName) => {
    setUploadingComanda(true);
    setUploadProgress({
      current: 0,
      total: files.length,
      fileName: baseName,
      percent: 5,
      status: `Preparando ${files.length} arquivo(s)...`,
      isDone: false
    });

    try {
      const newValuesToStore = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const displayName = files.length > 1 ? `${baseName} (${i + 1})` : baseName;
        const currentPercent = Math.round((i / files.length) * 85) + 5;

        setUploadProgress({
          current: i + 1,
          total: files.length,
          fileName: displayName,
          percent: currentPercent,
          status: `Enviando arquivo ${i + 1} de ${files.length}...`,
          isDone: false
        });

        let fileToUpload = file;
        if (shouldCompress && file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }

        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
        const fileName = `equipment_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const valueToStore = displayName ? `${publicUrl}?anexo=3|||${displayName}` : `${publicUrl}?anexo=3`;
        newValuesToStore.push(valueToStore);
      }

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Atualizando registro...',
        percent: 95,
        status: 'Salvando alterações no prontuário...',
        isDone: false
      });

      setLocalSurgery(prev => {
        const existingUrls = prev.comanda_urls || [];
        const updatedUrls = [...existingUrls, ...newValuesToStore];

        supabase.from('surgeries')
          .update({ comanda_urls: updatedUrls })
          .eq('id', prev.id)
          .then(({ error }) => {
            if (error) console.error('Erro ao atualizar banco:', error);
          });

        return {
          ...prev,
          comanda_urls: updatedUrls
        };
      });

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Concluído!',
        percent: 100,
        status: 'Todos os anexos foram enviados com sucesso!',
        isDone: true
      });

      setTimeout(() => {
        setUploadProgress(null);
      }, 1200);

    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload dos anexos: ' + err.message);
      setUploadProgress(null);
    } finally {
      setUploadingComanda(false);
    }
  };

  const uploadAndAddComandaFile = (file, shouldCompress = false) => {
    requestAttachmentName([file], shouldCompress, true);
  };

  const processComandaBatchUpload = async (files, shouldCompress, baseName) => {
    setUploadingComanda(true);
    setUploadProgress({
      current: 0,
      total: files.length,
      fileName: baseName,
      percent: 5,
      status: `Preparando ${files.length} arquivo(s)...`,
      isDone: false
    });

    try {
      const newValuesToStore = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const displayName = files.length > 1 ? `${baseName} (${i + 1})` : baseName;
        const currentPercent = Math.round((i / files.length) * 85) + 5;

        setUploadProgress({
          current: i + 1,
          total: files.length,
          fileName: displayName,
          percent: currentPercent,
          status: `Enviando arquivo ${i + 1} de ${files.length}...`,
          isDone: false
        });

        let fileToUpload = file;
        if (shouldCompress && file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }

        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
        const fileName = `comanda_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const valueToStore = displayName ? `${publicUrl}|||${displayName}` : publicUrl;
        newValuesToStore.push(valueToStore);
      }

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Atualizando registro...',
        percent: 95,
        status: 'Salvando alterações no prontuário...',
        isDone: false
      });

      setLocalSurgery(prev => {
        const existingUrls = prev.comanda_urls || [];
        const updatedUrls = [...existingUrls, ...newValuesToStore];

        supabase.from('surgeries')
          .update({ comanda_urls: updatedUrls })
          .eq('id', prev.id)
          .then(({ error }) => {
            if (error) console.error('Erro ao atualizar banco:', error);
          });

        const nextObj = {
          ...prev,
          comanda_urls: updatedUrls
        };
        if (onUpdate) onUpdate(nextObj);
        return nextObj;
      });

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Concluído!',
        percent: 100,
        status: 'Todos os anexos foram enviados com sucesso!',
        isDone: true
      });

      setTimeout(() => {
        setUploadProgress(null);
      }, 1200);

    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload das comandas: ' + err.message);
      setUploadProgress(null);
    } finally {
      setUploadingComanda(false);
    }
  };

  const handleConfirmAttachmentName = async () => {
    if (!attachmentNameInput || !attachmentNameInput.trim()) {
      setAttachmentNameError('A identificação do anexo é OBRIGATÓRIA!');
      return;
    }
    const nameToUse = attachmentNameInput.trim();
    const item = pendingAttachment;
    setPendingAttachment(null);
    setAttachmentNameError('');

    if (item.isComanda === 'equipment') {
      await processEquipmentBatchUpload(item.files, item.shouldCompress, nameToUse);
    } else if (item.isComanda) {
      await processComandaBatchUpload(item.files, item.shouldCompress, nameToUse);
    } else {
      await processMedicalRequestBatchUpload(item.files, item.shouldCompress, nameToUse);
    }
  };
  const removeComandaUrl = async (itemToRemove) => {
    setUploadingComanda(true);
    const previousUrls = localSurgery.comanda_urls;
    try {
      const updatedUrls = (localSurgery.comanda_urls || []).filter(url => url !== itemToRemove);
      setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));

      const filenameToDelete = extractFilename(itemToRemove);
      if (filenameToDelete) {
        await supabase.storage.from('attachments').remove([filenameToDelete]);
      }
      const { error: updateError } = await supabase.from('surgeries')
        .update({ comanda_urls: updatedUrls })
        .eq('id', localSurgery.id);
      if (updateError) throw updateError;
    } catch (err) {
      console.error(err);
      alert('Erro ao remover anexo: ' + err.message);
      setLocalSurgery(prev => ({ ...prev, comanda_urls: previousUrls }));
    } finally {
      setUploadingComanda(false);
    }
  };
  const handleUpdateComandaFileName = async (index, newName, url) => {
    const updatedUrls = [...(localSurgery.comanda_urls || [])];
    updatedUrls[index] = newName ? `${url}|||${newName.trim()}` : url;
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

  const handleUpdateFileName = async (index, newName, url) => {
    const updatedUrls = [...(localSurgery.medical_request_urls || [])];
    updatedUrls[index] = newName ? `${url}|||${newName.trim()}` : url;
    const firstAttachmentUrl = updatedUrls.length > 0 ? (updatedUrls[0].includes('|||') ? updatedUrls[0].split('|||')[0] : updatedUrls[0]) : null;

    try {
      const { error: updateError } = await supabase.from('surgeries')
        .update({ medical_request_urls: updatedUrls, attachment_url: firstAttachmentUrl })
        .eq('id', localSurgery.id);

      if (updateError) throw updateError;

      setLocalSurgery(prev => ({
        ...prev,
        medical_request_urls: updatedUrls,
        attachment_url: firstAttachmentUrl
      }));
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar nome do anexo: ' + err.message);
    }
  };

  const formatBrazilianDate = (dateString) => {
    if (!dateString) return '-';
    // Se já estiver no formato DD/MM/AAAA, retorna como está
    if (dateString.includes('/')) return dateString;
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Função auxiliar para baixar um arquivo de URL e retornar como File com MIME Type válido
  const downloadFileFromUrl = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      
      let mimeType = blob.type || '';
      const lowerUrl = url.toLowerCase();
      
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (lowerUrl.includes('.pdf')) mimeType = 'application/pdf';
        else if (lowerUrl.includes('.png')) mimeType = 'image/png';
        else if (lowerUrl.includes('.webp')) mimeType = 'image/webp';
        else mimeType = 'image/jpeg';
      }

      if (mimeType.includes('jpg') || mimeType.includes('jpeg')) mimeType = 'image/jpeg';
      else if (mimeType.includes('pdf')) mimeType = 'application/pdf';
      else if (mimeType.includes('png')) mimeType = 'image/png';

      let extension = 'jpg';
      if (mimeType === 'application/pdf') extension = 'pdf';
      else if (mimeType === 'image/png') extension = 'png';
      else if (mimeType === 'image/jpeg') extension = 'jpg';
      else if (mimeType.includes('word') || mimeType.includes('officedocument')) extension = 'docx';

      const cleanFilename = filename.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
      const finalName = `${cleanFilename}.${extension}`;
      return new File([blob], finalName, { type: mimeType });
    } catch (err) {
      console.error('Erro ao baixar arquivo para compartilhamento:', err);
      return null;
    }
  };

  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      const item = localSurgery;
      
      // Monta o texto desta cirurgia
      let text = `*CIRURGIA - ${item.patient || 'N/A'}*\n\n`;
      text += `*Paciente:* ${item.patient || 'N/A'}\n`;
      text += `*Data/Hora:* ${formatBrazilianDate(item.date)} ${item.time || ''}\n`;
      text += `*Médico:* ${item.doctor || 'N/A'}\n`;
      text += `*Hospital:* ${item.hospital || 'N/A'}\n`;
      text += `*Convênio:* ${item.insurance || 'N/A'}\n`;
      text += `*Caráter:* ${item.carater || 'N/A'}\n`;
      text += `*Mat/Proc:* ${item.material_procedure || 'N/A'}\n`;
      text += `*Status:* ${item.status || 'N/A'}\n`;
      text += `*Instr. 1:* ${item.instrumentalist1 || 'N/A'}\n`;
      if (item.instrumentalist2) text += `*Instr. 2:* ${item.instrumentalist2}\n`;
      text += `*Vendedor:* ${item.salesperson || 'N/A'}\n`;
      if (item.observation) text += `*Obs:* ${item.observation}\n`;

      // Coleta e baixa os anexos
      const attachments = [];
      if (item.medical_request_urls && item.medical_request_urls.length > 0) {
        item.medical_request_urls.forEach(att => {
          if (!att) return;
          const url = att.includes('|||') ? att.split('|||')[0] : att;
          const name = att.includes('|||') ? att.split('|||')[1] : 'Anexo';
          attachments.push({ url, name, origin: 'anexo1' });
        });
      } else if (item.attachment_url) {
        attachments.push({ url: item.attachment_url, name: 'Anexo', origin: 'anexo1' });
      }

      if (item.comanda_urls && item.comanda_urls.length > 0) {
        item.comanda_urls.forEach(att => {
          if (!att) return;
          let url = '';
          let name = 'Comanda';
          let origin = 'anexo2';
          
          if (att.startsWith('[ANEXO_3]|||')) {
            origin = 'anexo3';
            const parts = att.split('|||'); // ['[ANEXO_3]', url, name]
            url = parts[1] || '';
            name = parts[2] || 'Equipamento/Descartável';
          } else {
            const parts = att.split('|||'); // [url, name]
            url = parts[0] || '';
            name = parts[1] || 'Comanda';
            if (url.includes('?anexo=3') || url.includes('&anexo=3')) {
              origin = 'anexo3';
              if (name === 'Comanda') name = 'Equipamento/Descartável';
            }
          }
          
          if (url) {
            attachments.push({ url, name, origin });
          }
        });
      }

      const filesToShare = [];
      if (attachments.length > 0) {
        const attachNames = attachments.map(a => a.name);
        text += `*Anexos:* ${attachNames.join(', ')} _(enviado${attachNames.length > 1 ? 's' : ''} em anexo)_\n`;

        const cleanPatient = (item.patient || 'N_A').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        
        // Baixa TODOS os arquivos em PARALELO instantaneamente para não expirar a permissão do clique no celular
        const downloadedFiles = await Promise.all(
          attachments.map(async (att) => {
            const file = await downloadFileFromUrl(att.url, `${cleanPatient}_${att.name}`);
            if (file) file.origin = att.origin;
            return file;
          })
        );
        
        downloadedFiles.forEach(file => {
          if (file) filesToShare.push(file);
        });

        // Ordena para que imagens venham primeiro e PDFs depois (evita layout do WhatsApp priorizar o PDF)
        filesToShare.sort((a, b) => {
          if (a.type.startsWith('image/') && !b.type.startsWith('image/')) return -1;
          if (!a.type.startsWith('image/') && b.type.startsWith('image/')) return 1;
          return 0;
        });
      }

      if (filesToShare.length > 0) {
        // Se houver anexos, abre o Modal com as opções para o usuário escolher
        setShareModalData({
          text: text,
          files: filesToShare,
          patient: item.patient || 'N/A'
        });
        return;
      }

      // Se não houver anexos, envia diretamente o texto no WhatsApp
      if (navigator.share) {
        try {
          await navigator.share({ text: text });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      const encodedText = encodeURIComponent(text);
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    } catch (err) {
      console.error('Erro ao compartilhar no WhatsApp:', err);
      alert('Ocorreu um erro ao compartilhar no WhatsApp.');
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return 'status-delivered';
    if (s.includes('suspensa')) return 'status-suspended';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return 'status-preparing';
    if (s.includes('separado') || s.includes('entrega')) return 'status-ready';
    if (s.includes('urgência') || s.includes('urgencia')) return 'status-urgent';
    if (s.includes('agendada')) return 'status-urgent';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao') || s.includes('autorizada')) return 'status-pending';
    return 'status-default';
  };

  const getLegacyIcon = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return '🟢';
    if (s.includes('suspensa')) return '🔴';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return '🔵';
    if (s.includes('separado') || s.includes('entrega')) return '🟠';
    if (s.includes('urgência') || s.includes('urgencia')) return '🟣';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao') || s.includes('autorizada')) return '🟡';
    if (s.includes('eletiva')) return '⚪';
    return '⚪';
  };

  return (
    <div className="surgery-details-container" style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        .details-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          background-color: var(--bg-secondary, #f8fafc);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 4px;
          display: flex;
          flex-direction: column;
          min-width: 220px;
          z-index: 1000;
        }
        @media (max-width: 768px) {
          .details-dropdown-menu {
            left: 0 !important;
            right: auto !important;
          }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          className="btn-secondary" 
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <ArrowLeft size={18} />
          <span>Voltar para o Mapa</span>
        </button>

        {(onEdit && isFieldEditable('edit_surgery_button')) && (
          <button 
            className="btn-primary" 
            onClick={onEdit}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '10px 16px', 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              color: '#fff', 
              borderRadius: '8px', fontWeight: 'bold', border: 'none',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Edit size={18} />
            <span>Editar Agendamento</span>
          </button>
        )}

        <button
          className="btn-primary"
          title="Compartilhar no WhatsApp"
          onClick={handleShareWhatsApp}
          disabled={isSharingWhatsApp}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 16px',
            background: '#25D366',
            opacity: isSharingWhatsApp ? 0.7 : 1,
            cursor: isSharingWhatsApp ? 'not-allowed' : 'pointer',
            border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold'
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
          </svg>
          <span>{isSharingWhatsApp ? 'Preparando...' : 'Compartilhar via WhatsApp'}</span>
        </button>
      </div>

      <div className="modal-header" style={{ borderRadius: '8px 8px 0 0', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Detalhes da Cirurgia</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>Status:</span>
          <span className={`status-badge ${getStatusClass(localSurgery.status)}`} style={{ fontSize: '1rem', padding: '6px 12px' }}>
            {localSurgery.delivery_status || getLegacyIcon(localSurgery.status)} {localSurgery.status}
          </span>
        </div>
      </div>

      <div className="surgery-details-content" style={{ borderRadius: '0 0 8px 8px', backgroundColor: 'var(--surface-color)', padding: '16px', boxShadow: '0 4px 6px var(--shadow-color)', boxSizing: 'border-box', width: '100%', overflowX: 'hidden' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          {/* Informações Principais */}
          <div className="detail-section" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} /> Paciente e Local
            </h3>
            
            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Paciente</label>
              <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{surgery.patient || '-'}</div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Hospital</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                <MapPin size={16} color="var(--text-secondary)"/> {surgery.hospital || '-'}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Médico</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{surgery.doctor || '-'}</div>
            </div>
            
            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Convênio</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{surgery.insurance || '-'}</div>
            </div>
          </div>

          {/* Dados da Cirurgia */}
          <div className="detail-section" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} /> Dados da Cirurgia
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="detail-item">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Data</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  <Calendar size={16} color="var(--text-secondary)"/> {formatBrazilianDate(surgery.date)}
                </div>
              </div>

              <div className="detail-item">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Hora</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  <Clock size={16} color="var(--text-secondary)"/> {surgery.time || '--:--'}
                </div>
              </div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Tipo de Cirurgia</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{surgery.surgery_type || '-'}</div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Caráter</label>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: (surgery.carater === 'URGÊNCIA' || surgery.carater === 'URGENCIA') ? '#ef4444' : (surgery.carater === 'JUDICIAL' ? '#a855f7' : 'var(--text-primary)') }}>
                {surgery.carater || '-'}
              </div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Código do Sistema - (Spica)</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{surgery.surgery_code || '-'}</div>
            </div>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Material / Procedimento</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{surgery.material_procedure || '-'}</div>
            </div>


          </div>

          {/* Equipe e Checklists */}
          <div className="detail-section" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
             <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} /> Equipe e Checklists
            </h3>

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Instrumentadores</label>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>1: {surgery.instrumentalist1 || '-'}</div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>2: {surgery.instrumentalist2 || '-'}</div>
            </div>

            {user?.role !== 'Vendedor' && (
              <div className="detail-item">
                <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Vendedor</label>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{surgery.salesperson || '-'}</div>
              </div>
            )}

            <div className="detail-item">
              <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>Checklists</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: surgery.opme_checked ? '#10b981' : 'var(--text-secondary)' }}>
                  <CheckCircle size={18} /> OPME
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: surgery.cme_checked ? '#10b981' : 'var(--text-secondary)' }}>
                  <CheckCircle size={18} /> CME
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: surgery.bloco_checked ? '#10b981' : 'var(--text-secondary)' }}>
                  <CheckCircle size={18} /> BLOCO
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: surgery.pos_checked ? '#10b981' : 'var(--text-secondary)' }}>
                  <CheckCircle size={18} /> PÓS
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Anexos de Solicitação Médica / Autorização */}
        <div 
          className={`attachment-card-container ${(isEditable && isFieldEditable('attachment_url')) ? 'paste-dropzone' : ''}`} 
          onPaste={(isEditable && isFieldEditable('attachment_url')) ? handlePasteImages : undefined}
          onFocus={(isEditable && isFieldEditable('attachment_url')) ? () => setIsDropzoneFocused1(true) : undefined}
          onBlur={(isEditable && isFieldEditable('attachment_url')) ? () => setIsDropzoneFocused1(false) : undefined}
          tabIndex={(isEditable && isFieldEditable('attachment_url')) ? 0 : undefined}
          style={{ 
            marginTop: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            outline: 'none',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s'
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0
              }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary, #0f172a)' }}>
                  Anexo 1 · Solicitação médica / Autorização
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                  Documento de solicitação e autorização do procedimento
                </div>
              </div>
            </div>

            <div>
              {(() => {
                const hasFiles = (localSurgery.medical_request_urls && localSurgery.medical_request_urls.length > 0) || !!localSurgery.attachment_url;
                return hasFiles ? (
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Anexado
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Pendente
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Dropzone Container */}
          <div style={{
            border: (isEditable && isFieldEditable('attachment_url') && isDropzoneFocused1) 
              ? '2px dashed #2563eb' 
              : '1px dashed var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            padding: '24px 16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            minHeight: '90px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: (isEditable && isFieldEditable('attachment_url') && isDropzoneFocused1) ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
          }}>
            {(() => {
              const allAttachmentUrls = (localSurgery.medical_request_urls && localSurgery.medical_request_urls.length > 0)
                ? localSurgery.medical_request_urls
                : (localSurgery.attachment_url ? [localSurgery.attachment_url] : []);
              
              if (allAttachmentUrls.length === 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                    <EyeOff size={24} style={{ color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                      Nenhum anexo de solicitação ou autorização enviado.
                    </span>
                  </div>
                );
              }

              return (
                <div id="details-attachment-previews-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', width: '100%' }}>
                  {allAttachmentUrls.map((item, idx) => {
                    const { url, name } = parsePrintUrl(item);
                    return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {isDocumentFile(url) ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', width: '120px', height: '120px', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer', textDecoration: 'none' }}>
                            {url.toLowerCase().includes('.pdf') ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <FileText size={40} style={{ color: '#ef4444' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444' }}>PDF</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <FileText size={40} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6' }}>WORD</span>
                              </div>
                            )}
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={url} 
                              alt={name || `Solicitacao ${idx + 1}`} 
                              style={{ maxWidth: '200px', maxHeight: '200px', cursor: 'zoom-in', objectFit: 'contain' }} 
                            />
                          </a>
                        )}
                        {(isEditable && isFieldEditable('attachment_url')) && showDeleteIcons && (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPendingDeleteAttachment({ item, isComanda: false });
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '13px',
                              lineHeight: '1',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              zIndex: 10
                            }}
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {(isEditable && isFieldEditable('attachment_url')) && showDeleteIcons ? (
                        <input
                          type="text"
                          key={`${idx}`}
                          value={name || ''}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updatedUrls = [...(localSurgery.medical_request_urls || [])];
                            updatedUrls[idx] = newName ? `${url}|||${newName}` : url;
                            setLocalSurgery(prev => ({ ...prev, medical_request_urls: updatedUrls }));
                          }}
                          placeholder="Identificação..."
                          style={{
                            width: '120px',
                            fontSize: '0.75rem',
                            padding: '4px 6px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '6px',
                            textAlign: 'center',
                            marginTop: '4px'
                          }}
                        />
                      ) : (
                        name && (
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center', maxWidth: '200px', wordBreak: 'break-word' }}>
                            {name}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
                </div>
              );
            })()}
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(isEditable && isFieldEditable('edit_attachments_1_button')) && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteIcons(true);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit size={15} /> Editar anexos
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowDeleteIcons(false);
                    try {
                      const firstUrl = localSurgery.medical_request_urls?.[0];
                      const attUrl = firstUrl ? (firstUrl.includes('|||') ? firstUrl.split('|||')[0] : firstUrl) : null;
                      await supabase.from('surgeries').update({
                        medical_request_urls: localSurgery.medical_request_urls,
                        attachment_url: attUrl
                      }).eq('id', localSurgery.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Save size={15} /> Salvar anexos
                </button>
              </>
            )}
            {(isEditable && isFieldEditable('attachment_url')) && (
              <div id="details-attachment-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAttachmentDropdown(!showAttachmentDropdown);
                  }}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    opacity: uploading ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={15} /> {uploading ? 'Enviando...' : 'Inserir anexos'}
                </button>

                {showAttachmentDropdown && (
                  <>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAttachmentDropdown(false);
                      }} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                    />
                    <div 
                      className="details-dropdown-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '200px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAttachmentDropdown(false);
                          const el = document.getElementById('camera-input-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📷 Câmera (Tirar Foto)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAttachmentDropdown(false);
                          const el = document.getElementById('gallery-input-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        🖼️ Galeria (Escolher Imagem)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAttachmentDropdown(false);
                          const el = document.getElementById('file-input-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <FileText size={18} color="#ef4444" style={{ flexShrink: 0 }} /> Arquivos (Somente PDF)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOptionClick(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📋 Print (Ctrl+V)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Hidden Inputs for details page */}
          {(isEditable && isFieldEditable('attachment_url')) && (
            <>
              <input 
                type="file" 
                id="camera-input-details" 
                accept="image/*" 
                capture="environment" 
                style={{ display: 'none' }} 
                onChange={handleCameraSelect} 
              />
              <input 
                type="file" 
                id="gallery-input-details" 
                accept="image/*" 
                multiple
                style={{ display: 'none' }} 
                onChange={handleGallerySelect} 
              />
              <input 
                type="file" 
                id="file-input-details" 
                accept=".pdf,application/pdf" 
                multiple
                style={{ display: 'none' }} 
                onChange={handleFileDocumentSelect} 
              />
            </>
          )}
        </div>

        {/* Anexos de Comanda / Documentação Cirúrgica */}
        <div 
          className={`attachment-card-container ${(isEditable && isFieldEditable('comanda_urls')) ? 'paste-dropzone' : ''}`} 
          onPaste={(isEditable && isFieldEditable('comanda_urls')) ? handlePasteComandaImages : undefined}
          onFocus={(isEditable && isFieldEditable('comanda_urls')) ? () => setIsDropzoneFocused2(true) : undefined}
          onBlur={(isEditable && isFieldEditable('comanda_urls')) ? () => setIsDropzoneFocused2(false) : undefined}
          tabIndex={(isEditable && isFieldEditable('comanda_urls')) ? 0 : undefined}
          style={{ 
            marginTop: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            outline: 'none',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s'
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
                flexShrink: 0
              }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary, #0f172a)' }}>
                  Anexo 2 · Comanda / Documentação cirúrgica
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                  Comanda cirúrgica e documentos complementares
                </div>
              </div>
            </div>

            <div>
              {(() => {
                const comandaFiles = (localSurgery.comanda_urls || []).filter(url => !url.startsWith('[ANEXO_3]|||') && !url.includes('?anexo=3'));
                const hasFiles = comandaFiles.length > 0 || !!localSurgery.comanda_url;
                return hasFiles ? (
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Anexado
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Pendente
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Dropzone Container */}
          <div style={{
            border: (isEditable && isFieldEditable('comanda_urls') && isDropzoneFocused2) 
              ? '2px dashed #2563eb' 
              : '1px dashed var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            padding: '24px 16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            minHeight: '90px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: (isEditable && isFieldEditable('comanda_urls') && isDropzoneFocused2) ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
          }}>
            {(() => {
              const allAttachmentUrls = (localSurgery.comanda_urls || []).filter(url => !url.startsWith('[ANEXO_3]|||') && !url.includes('?anexo=3'));
              
              if (allAttachmentUrls.length === 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                    <EyeOff size={24} style={{ color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                      Nenhum anexo de comanda ou documentação enviado.
                    </span>
                  </div>
                );
              }

              return (
                <div id="details-attachment-previews-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', width: '100%' }}>
                  {allAttachmentUrls.map((item, idx) => {
                    const { url, name } = parsePrintUrl(item);
                    return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {isDocumentFile(url) ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', width: '120px', height: '120px', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer', textDecoration: 'none' }}>
                            {url.toLowerCase().includes('.pdf') ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <FileText size={40} style={{ color: '#ef4444' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#ef4444' }}>PDF</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <FileText size={40} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6' }}>WORD</span>
                              </div>
                            )}
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={url} 
                              alt={name || `Solicitacao ${idx + 1}`} 
                              style={{ maxWidth: '200px', maxHeight: '200px', cursor: 'zoom-in', objectFit: 'contain' }} 
                            />
                          </a>
                        )}
                        {(isEditable && isFieldEditable('comanda_urls')) && showDeleteIconsComanda && (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPendingDeleteAttachment({ item, isComanda: true });
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '13px',
                              lineHeight: '1',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              zIndex: 10
                            }}
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {(isEditable && isFieldEditable('comanda_urls')) && showDeleteIconsComanda ? (
                        <input
                          type="text"
                          key={`${idx}`}
                          value={name || ''}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updatedUrls = [...(localSurgery.comanda_urls || [])];
                            updatedUrls[idx] = newName ? `${url}|||${newName}` : url;
                            setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));
                          }}
                          placeholder="Identificação..."
                          style={{
                            width: '120px',
                            fontSize: '0.75rem',
                            padding: '4px 6px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            borderRadius: '6px',
                            textAlign: 'center',
                            marginTop: '4px'
                          }}
                        />
                      ) : (
                        name && (
                          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center', maxWidth: '200px', wordBreak: 'break-word' }}>
                            {name}
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
                </div>
              );
            })()}
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(isEditable && isFieldEditable('edit_attachments_2_button')) && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteIconsComanda(true);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit size={15} /> Editar anexos
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowDeleteIconsComanda(false);
                    try {
                      const firstUrl = localSurgery.comanda_urls?.[0];
                      const cUrl = firstUrl ? (firstUrl.includes('|||') ? firstUrl.split('|||')[0] : firstUrl) : null;
                      await supabase.from('surgeries').update({
                        comanda_urls: localSurgery.comanda_urls,
                        comanda_url: cUrl
                      }).eq('id', localSurgery.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Save size={15} /> Salvar anexos
                </button>
              </>
            )}
            {(isEditable && isFieldEditable('comanda_urls')) && (
              <div id="details-comanda-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  disabled={uploadingComanda}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComandaDropdown(!showComandaDropdown);
                  }}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: uploadingComanda ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    opacity: uploadingComanda ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={15} /> {uploadingComanda ? 'Enviando...' : 'Inserir anexos'}
                </button>

                {showComandaDropdown && (
                  <>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComandaDropdown(false);
                      }} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                    />
                    <div 
                      className="details-dropdown-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '200px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowComandaDropdown(false);
                          const el = document.getElementById('camera-input-comanda-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📷 Câmera (Tirar Foto)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowComandaDropdown(false);
                          const el = document.getElementById('gallery-input-comanda-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        🖼️ Galeria (Escolher Imagem)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowComandaDropdown(false);
                          const el = document.getElementById('file-input-comanda-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <FileText size={18} color="#ef4444" style={{ flexShrink: 0 }} /> Arquivos (Somente PDF)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOptionClick(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📋 Print (Ctrl+V)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {(isEditable && isFieldEditable('comanda_urls')) && (
            <>
              <input 
                type="file" 
                id="camera-input-comanda-details" 
                accept="image/*" 
                capture="environment" 
                style={{ display: 'none' }} 
                onChange={handleCameraComandaSelect} 
              />
              <input 
                type="file" 
                id="gallery-input-comanda-details" 
                accept="image/*" 
                multiple
                style={{ display: 'none' }} 
                onChange={handleGalleryComandaSelect} 
              />
              <input 
                type="file" 
                id="file-input-comanda-details" 
                accept=".pdf,application/pdf"
                multiple
                style={{ display: 'none' }} 
                onChange={handleFileDocumentComandaSelect} 
              />
            </>
          )}
        </div>

        {/* Hidden Inputs for equipment */}
        {(isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls'))) && (
          <>
            <input 
              type="file" 
              id="camera-input-equipment-details" 
              accept="image/*" 
              capture="environment" 
              style={{ display: 'none' }} 
              onChange={handleCameraEquipmentSelect} 
            />
            <input 
              type="file" 
              id="gallery-input-equipment-details" 
              accept="image/*" 
              multiple
              style={{ display: 'none' }} 
              onChange={handleGalleryEquipmentSelect} 
            />
            <input 
              type="file" 
              id="file-input-equipment-details" 
              accept=".pdf,application/pdf"
              multiple
              style={{ display: 'none' }} 
              onChange={handleFileDocumentEquipmentSelect} 
            />
          </>
        )}

        {/* ANEXO 3 - DESCARTÁVEIS / IMPLANTES / INSTRUMENTAIS / EQUIPAMENTOS */}
        <div 
          tabIndex={0}
          onFocus={() => setIsDropzoneFocused3(true)}
          onBlur={() => setIsDropzoneFocused3(false)}
          onPaste={handlePasteEquipmentImages}
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            outline: 'none',
            marginTop: '20px'
          }}
        >
          {/* Header Section */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6366f1',
                flexShrink: 0
              }}>
                <Briefcase size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary, #0f172a)' }}>
                  Anexo 3 · Descartáveis / Implantes / Instrumentais / Equipamentos / Comprovante de entrega
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: '2px' }}>
                  imagem de descartáveis, implantes, instrumentais, equipamentos e comprovante de entrega
                </div>
              </div>
            </div>

            <div>
              {(() => {
                const equipmentFiles = (localSurgery.comanda_urls || []).filter(url => url.startsWith('[ANEXO_3]|||') || url.includes('?anexo=3'));
                return equipmentFiles.length > 0 ? (
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#059669',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Anexado
                  </span>
                ) : (
                  <span style={{
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600'
                  }}>
                    Pendente
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Dropzone Container */}
          <div style={{
            border: (isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls')) && isDropzoneFocused3) 
              ? '2px dashed #6366f1' 
              : '1px dashed var(--border-color, #cbd5e1)',
            borderRadius: '10px',
            padding: '24px 16px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            minHeight: '90px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            outline: 'none',
            transition: 'all 0.2s',
            boxShadow: (isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls')) && isDropzoneFocused3) ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none'
          }}>
            {(() => {
              const allEquipmentRaw = (localSurgery.comanda_urls || []).filter(url => url.startsWith('[ANEXO_3]|||') || url.includes('?anexo=3'));
              
              if (allEquipmentRaw.length === 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                    <EyeOff size={24} style={{ color: 'var(--text-secondary, #94a3b8)', opacity: 0.7 }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                      Nenhum anexo de descartáveis, implantes, instrumentais, equipamentos ou comprovante de entrega enviado.
                    </span>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', width: '100%' }}>
                  {allEquipmentRaw.map((rawItem, idx) => {
                    const cleanItem = rawItem.replace('[ANEXO_3]|||', '');
                    const { url, name } = parsePrintUrl(cleanItem);
                    return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {isDocumentFile(url) ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', width: '100px', height: '100px', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', color: '#64748b', textDecoration: 'none' }}>
                            {url.toLowerCase().includes('.pdf') ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <FileText size={32} style={{ color: '#ef4444' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#ef4444' }}>PDF</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <FileText size={32} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#3b82f6' }}>WORD</span>
                              </div>
                            )}
                          </a>
                        ) : (
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={url} 
                              alt={name || `Equipamento ${idx + 1}`} 
                              style={{ maxWidth: '200px', maxHeight: '200px', cursor: 'zoom-in', objectFit: 'contain' }} 
                            />
                          </a>
                        )}
                        {(isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls'))) && showDeleteIconsEquipment && (
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setPendingDeleteAttachment({ item: rawItem, isComanda: true });
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '13px',
                              lineHeight: '1',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                              zIndex: 10
                            }}
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {showDeleteIconsEquipment ? (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updatedUrls = [...(localSurgery.comanda_urls || [])];
                            const realIdx = updatedUrls.indexOf(rawItem);
                            if (realIdx !== -1) {
                              updatedUrls[realIdx] = newName ? `[ANEXO_3]|||${url}|||${newName.trim()}` : `[ANEXO_3]|||${url}`;
                              setLocalSurgery(prev => ({ ...prev, comanda_urls: updatedUrls }));
                            }
                          }}
                          placeholder="Identificação..."
                          style={{
                            fontSize: '0.78rem',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            width: '110px',
                            textAlign: 'center'
                          }}
                        />
                      ) : (
                        name && (
                          <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)', textAlign: 'center', maxWidth: '140px' }}>
                            {name}
                          </span>
                        )
                      )}
                    </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Previews and empty states */}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            {(isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls'))) && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteIconsEquipment(!showDeleteIconsEquipment)}
                  style={{
                    backgroundColor: showDeleteIconsEquipment ? '#f1f5f9' : '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit size={15} /> Editar anexos
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowDeleteIconsEquipment(false);
                    try {
                      await supabase.from('surgeries').update({
                        comanda_urls: localSurgery.comanda_urls
                      }).eq('id', localSurgery.id);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Save size={15} /> Salvar anexos
                </button>
              </>
            )}
            {(isEditable && (isFieldEditable('comanda_urls') || isFieldEditable('equipment_urls'))) && (
              <div id="details-equipment-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  disabled={uploadingComanda}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEquipmentDropdown(!showEquipmentDropdown);
                  }}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: uploadingComanda ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    opacity: uploadingComanda ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <Upload size={15} /> {uploadingComanda ? 'Enviando...' : 'Inserir anexos'}
                </button>

                {showEquipmentDropdown && (
                  <>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEquipmentDropdown(false);
                      }} 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                    />
                    <div 
                      className="details-dropdown-menu"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        zIndex: 1000,
                        minWidth: '200px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEquipmentDropdown(false);
                          const el = document.getElementById('camera-input-equipment-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📷 Câmera (Tirar Foto)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEquipmentDropdown(false);
                          const el = document.getElementById('gallery-input-equipment-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        🖼️ Galeria (Escolher Imagem)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEquipmentDropdown(false);
                          const el = document.getElementById('file-input-equipment-details');
                          if (el) el.click();
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        <FileText size={18} color="#ef4444" style={{ flexShrink: 0 }} /> Arquivos (Somente PDF)
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOptionClick('equipment');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary, #0f172a)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        📋 Print (Ctrl+V)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        <div className="detail-section" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Observações
          </h3>
          <div className="detail-item" style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', minHeight: '100px' }}>
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{localSurgery.observation || 'Nenhuma observação.'}</div>
          </div>
        </div>
      </div>

      {/* Modal de Escolha para Compartilhar no WhatsApp */}
      {shareModalData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary, #ffffff)',
            color: 'var(--text-primary, #0f172a)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageCircle size={22} /> Compartilhar no WhatsApp
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Cirurgia de <strong>{shareModalData.patient}</strong> · {shareModalData.files.length} anexo(s)
                </span>
              </div>
              <button 
                onClick={() => setShareModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => {
                  const encodedText = encodeURIComponent(shareModalData.text);
                  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background-color 0.2s'
                }}
              >
                <Send size={18} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>Enviar texto da cirurgia</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 'normal' }}>Envia a mensagem limpa no WhatsApp</div>
                </div>
              </button>

              {/* Anexo 1 */}
              {(() => {
                const imgFiles1 = shareModalData.files.filter(f => f.type.startsWith('image/') && f.origin === 'anexo1');
                const pdfFiles1 = shareModalData.files.filter(f => f.type === 'application/pdf' && f.origin === 'anexo1');
                if (imgFiles1.length === 0 && pdfFiles1.length === 0) return null;
                const isCollapsed = collapsedSections.anexo1;
                
                return (
                  <div style={{ 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '12px', padding: '12px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <div 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, anexo1: !prev.anexo1 }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Anexo 1</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>- solicitação médica / autorização</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                          {imgFiles1.length > 0 && `${imgFiles1.length} img`}{imgFiles1.length > 0 && pdfFiles1.length > 0 && ' · '}{pdfFiles1.length > 0 && `${pdfFiles1.length} pdf`}
                        </span>
                        {isCollapsed ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <ChevronUp size={14} style={{ color: '#64748b' }} />}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {imgFiles1.length > 0 && (
                          <button
                            onClick={async () => {
                              const imgFiles = imgFiles1.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: imgFiles })) {
                                try {
                                  await navigator.share({
                                    files: imgFiles,
                                    title: `Imagens Anexo 1 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              imgFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${imgFiles.length} imagem(ns) baixada(s). Anexe-as no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#2563eb', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Paperclip size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + Imagens ({imgFiles1.length})</div>
                          </button>
                        )}
                        
                        {pdfFiles1.length > 0 && (
                          <button
                            onClick={async () => {
                              const pdfFiles = pdfFiles1.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: pdfFiles })) {
                                try {
                                  await navigator.share({
                                    files: pdfFiles,
                                    title: `PDFs Anexo 1 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              pdfFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${pdfFiles.length} PDF(s) baixado(s). Anexe-os no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#dc2626', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FileText size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + PDF ({pdfFiles1.length})</div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Anexo 2 */}
              {(() => {
                const imgFiles2 = shareModalData.files.filter(f => f.type.startsWith('image/') && f.origin === 'anexo2');
                const pdfFiles2 = shareModalData.files.filter(f => f.type === 'application/pdf' && f.origin === 'anexo2');
                if (imgFiles2.length === 0 && pdfFiles2.length === 0) return null;
                const isCollapsed = collapsedSections.anexo2;
                
                return (
                  <div style={{ 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '12px', padding: '12px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <div 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, anexo2: !prev.anexo2 }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Anexo 2</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>- comanda / documentação</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                          {imgFiles2.length > 0 && `${imgFiles2.length} img`}{imgFiles2.length > 0 && pdfFiles2.length > 0 && ' · '}{pdfFiles2.length > 0 && `${pdfFiles2.length} pdf`}
                        </span>
                        {isCollapsed ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <ChevronUp size={14} style={{ color: '#64748b' }} />}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {imgFiles2.length > 0 && (
                          <button
                            onClick={async () => {
                              const imgFiles = imgFiles2.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: imgFiles })) {
                                try {
                                  await navigator.share({
                                    files: imgFiles,
                                    title: `Imagens Anexo 2 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              imgFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${imgFiles.length} imagem(ns) baixada(s). Anexe-as no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#2563eb', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Paperclip size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + Imagens ({imgFiles2.length})</div>
                          </button>
                        )}
                        
                        {pdfFiles2.length > 0 && (
                          <button
                            onClick={async () => {
                              const pdfFiles = pdfFiles2.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: pdfFiles })) {
                                try {
                                  await navigator.share({
                                    files: pdfFiles,
                                    title: `PDFs Anexo 2 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              pdfFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${pdfFiles.length} PDF(s) baixado(s). Anexe-os no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#dc2626', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FileText size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + PDF ({pdfFiles2.length})</div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Anexo 3 */}
              {(() => {
                const imgFiles3 = shareModalData.files.filter(f => f.type.startsWith('image/') && f.origin === 'anexo3');
                const pdfFiles3 = shareModalData.files.filter(f => f.type === 'application/pdf' && f.origin === 'anexo3');
                if (imgFiles3.length === 0 && pdfFiles3.length === 0) return null;
                const isCollapsed = collapsedSections.anexo3;
                
                return (
                  <div style={{ 
                    border: '1px solid var(--border-color, #e2e8f0)', 
                    borderRadius: '12px', padding: '12px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    display: 'flex', flexDirection: 'column', gap: '10px'
                  }}>
                    <div 
                      onClick={() => setCollapsedSections(prev => ({ ...prev, anexo3: !prev.anexo3 }))}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>Anexo 3</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>- descartáveis / implantes / equipamentos / comprovante</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontWeight: '500' }}>
                          {imgFiles3.length > 0 && `${imgFiles3.length} img`}{imgFiles3.length > 0 && pdfFiles3.length > 0 && ' · '}{pdfFiles3.length > 0 && `${pdfFiles3.length} pdf`}
                        </span>
                        {isCollapsed ? <ChevronDown size={14} style={{ color: '#64748b' }} /> : <ChevronUp size={14} style={{ color: '#64748b' }} />}
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {imgFiles3.length > 0 && (
                          <button
                            onClick={async () => {
                              const imgFiles = imgFiles3.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: imgFiles })) {
                                try {
                                  await navigator.share({
                                    files: imgFiles,
                                    title: `Imagens Anexo 3 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              imgFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${imgFiles.length} imagem(ns) baixada(s). Anexe-as no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#2563eb', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Paperclip size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + Imagens ({imgFiles3.length})</div>
                          </button>
                        )}
                        
                        {pdfFiles3.length > 0 && (
                          <button
                            onClick={async () => {
                              const pdfFiles = pdfFiles3.map(f => new File([f], f.name, { type: f.type }));
                              if (navigator.share && navigator.canShare && navigator.canShare({ files: pdfFiles })) {
                                try {
                                  await navigator.share({
                                    files: pdfFiles,
                                    title: `PDFs Anexo 3 - ${shareModalData.patient}`,
                                    text: shareModalData.text
                                  });
                                  return;
                                } catch (e) {
                                  if (e.name === 'AbortError') return;
                                }
                              }
                              pdfFiles.forEach(file => {
                                const blobUrl = URL.createObjectURL(file);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                              });
                              alert(`${pdfFiles.length} PDF(s) baixado(s). Anexe-os no WhatsApp.`);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px',
                              backgroundColor: '#dc2626', color: '#ffffff', border: 'none', flex: 1,
                              borderRadius: '8px', fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <FileText size={15} style={{ flexShrink: 0 }} />
                            <div style={{ whiteSpace: 'nowrap' }}>Texto + PDF ({pdfFiles3.length})</div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Share all button (footer) */}
              <button
                onClick={async () => {
                  const allFiles = shareModalData.files.map(f => new File([f], f.name, { type: f.type }));
                  
                  if (navigator.share && navigator.canShare && navigator.canShare({ files: allFiles })) {
                    try {
                      await navigator.share({
                        text: shareModalData.text,
                        files: allFiles,
                        title: `Cirurgia - ${shareModalData.patient}`
                      });
                      return; // Compartilhado com sucesso via tela nativa do OS!
                    } catch (e) {
                      console.error("Erro ao usar navigator.share:", e);
                      // Se foi cancelado pelo usuário (AbortError), não faz nada
                      if (e.name === 'AbortError') return;
                    }
                  }
                  
                  // Fallback para computadores (onde navigator.share de arquivos não é suportado) ou falha no celular:
                  // 1. Abre a tela do WhatsApp Web IMEDIATAMENTE de forma síncrona com o gesto do usuário
                  // Isso garante que o navegador NÃO bloqueie a nova aba como popup indesejado
                  const encodedText = encodeURIComponent(shareModalData.text);
                  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                  
                  // 2. Dispara o download em background de todos os anexos para que o usuário possa arrastar e soltar
                  shareModalData.files.forEach(file => {
                    const blobUrl = URL.createObjectURL(file);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = file.name;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  color: '#16a34a',
                  border: '1px solid #16a34a',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s'
                }}
              >
                <Share2 size={18} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold' }}>Enviar texto + anexos juntos</div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', opacity: 0.9 }}>
                    Tentativa direta simultânea · apenas no computador
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Customizado de Identificação do Anexo */}
      {pendingAttachment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <FileText size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Identificar Anexo{pendingAttachment.files.length > 1 ? `s (${pendingAttachment.files.length} arquivos)` : ''} (Obrigatório)
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: '1.4' }}>
              {pendingAttachment.files.length > 1 
                ? `Informe o nome base para identificar os ${pendingAttachment.files.length} arquivos selecionados:`
                : 'Informe o nome ou escolha uma opção rápida para identificar este arquivo:'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(pendingAttachment.isComanda === 'equipment' ? [
                'MAT. ESTERIL', 'CAIXA', 'EQUIPAMENTO', 'COMPROVANTE DE ENTREGA'
              ] : pendingAttachment.isComanda ? [
                'Comanda', 'Documentação', 'Prontuário', 'Exame'
              ] : [
                'Solicitação', 'Autorização', 'Pedido Médico', 'Laudo'
              ]).map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setAttachmentNameInput(chip);
                    setAttachmentNameError('');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: attachmentNameInput === chip ? '#2563eb' : '#f8fafc',
                    color: attachmentNameInput === chip ? '#ffffff' : '#334155',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                autoFocus
                value={attachmentNameInput}
                onChange={(e) => {
                  setAttachmentNameInput(e.target.value);
                  setAttachmentNameError('');
                }}
                placeholder="Ex: Solicitação, Autorização, Comanda..."
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: attachmentNameError ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmAttachmentName();
                  }
                }}
              />
              {attachmentNameError && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 500, marginTop: '4px' }}>
                  {attachmentNameError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setPendingAttachment(null);
                  setAttachmentNameError('');
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAttachmentName}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                Confirmar e Anexar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Customizado de Progresso de Upload */}
      {uploadProgress && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '32px 28px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: uploadProgress.isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: uploadProgress.isDone ? '#10b981' : '#2563eb',
              transition: 'all 0.3s'
            }}>
              {uploadProgress.isDone ? (
                <CheckCircle size={36} />
              ) : (
                <Upload size={32} />
              )}
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {uploadProgress.isDone ? 'Anexos Enviados!' : 'Enviando Anexos'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                {uploadProgress.status}
              </p>
            </div>

            <div style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                justify: 'space-between',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '8px'
              }}>
                <span>{uploadProgress.fileName}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              
              <div style={{
                width: '100%',
                height: '10px',
                backgroundColor: '#e2e8f0',
                borderRadius: '999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress.percent}%`,
                  height: '100%',
                  background: uploadProgress.isDone ? '#10b981' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease-in-out'
                }} />
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Por favor, aguarde a conclusão do carregamento...
            </div>
          </div>
        </div>
      )}
      {/* Modal Customizado de Confirmação de Exclusão de Anexo */}
      {pendingDeleteAttachment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0
              }}>
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Excluir Anexo?
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Esta ação removerá o arquivo do prontuário da cirurgia.
                </p>
              </div>
            </div>

            <div style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.88rem',
              color: '#334155',
              fontWeight: 500
            }}>
              📄 <strong>{parsePrintUrl(pendingDeleteAttachment.item).name || 'Anexo sem identificação'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setPendingDeleteAttachment(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingDeleteAttachment;
                  setPendingDeleteAttachment(null);
                  if (target.isComanda) {
                    await removeComandaUrl(target.item);
                  } else {
                    await removeMedicalRequestUrl(target.item);
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)'
                }}
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

