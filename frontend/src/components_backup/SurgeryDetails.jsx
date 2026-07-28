import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, User, FileText, CheckCircle, Activity, Briefcase, Calendar, Image as ImageIcon, Upload, Trash2, MessageCircle, Paperclip, Share2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

const parsePrintUrl = (item) => {
  if (!item) return { url: '', name: '' };
  if (item.includes('|||')) {
    const [url, ...nameParts] = item.split('|||');
    return { url, name: nameParts.join('|||') };
  }
  return { url: item, name: '' };
};

const isDocumentFile = (url) => {
  if (!url) return false;
  const cleanUrl = url.split('|||')[0].toLowerCase();
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

export default function SurgeryDetails({ surgery, onBack, user }) {
  const [localSurgery, setLocalSurgery] = useState(surgery);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [isDropzoneFocused, setIsDropzoneFocused] = useState(false);
  const [showDeleteIcons, setShowDeleteIcons] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [shareModalData, setShareModalData] = useState(null);

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
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAttachmentDropdown, showDeleteIcons]);

  if (!localSurgery) return null;

  const isEditable = user?.permissions?.can_view_only ? false : (user?.permissions?.can_edit ?? (user?.role === 'Admin' || user?.role === 'Gerente' || user?.role === 'TI' || user?.role === 'Administrativo' || user?.role === 'Diretoria'));

  const isFieldEditable = (fieldName) => {
    if (!isEditable) return false;
    if (!user?.permissions?.allowed_edit_fields) return true;
    return user.permissions.allowed_edit_fields.includes(fieldName);
  };

  // Lê a URL do anexo direto da nova coluna do banco de dados
  let attachedImageUrl = localSurgery.attachment_url || null;

  const handleCameraSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      await uploadAndAddFile(file, true);
    }
  };

  const handleGallerySelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      await uploadAndAddFile(file, true);
    }
  };

  const handleFileDocumentSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert("Formato não permitido! Por favor, anexe apenas arquivos PDF.");
        continue;
      }
      await uploadAndAddFile(file, false);
    }
  };

  const handlePasteImages = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          await uploadAndAddFile(file, true);
        }
      }
    }
  };

  const uploadAndAddFile = async (file, shouldCompress = false) => {
    const displayName = prompt("Digite o nome/identificação para este anexo (ex: Solicitação, Autorização):");
    const printName = displayName ? displayName.trim() : "";

    setUploading(true);
    try {
      let fileToUpload = file;
      if (shouldCompress && file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }

      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
      const fileName = `medical_request_${Date.now()}_${Math.floor(Math.random() * 100000)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      const valueToStore = printName ? `${publicUrl}|||${printName}` : publicUrl;
      const updatedUrls = [...(localSurgery.medical_request_urls || []), valueToStore];
      const firstAttachmentUrl = updatedUrls.length > 0 ? (updatedUrls[0].includes('|||') ? updatedUrls[0].split('|||')[0] : updatedUrls[0]) : null;

      const { error: updateError } = await supabase.from('surgeries')
        .update({ medical_request_urls: updatedUrls, attachment_url: firstAttachmentUrl })
        .eq('id', localSurgery.id);

      if (updateError) throw updateError;

      setLocalSurgery(prev => ({
        ...prev,
        medical_request_urls: updatedUrls,
        attachment_url: firstAttachmentUrl
      }));

      alert('SALVO COM SUCESSO');
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da imagem: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedicalRequestUrl = async (itemToRemove) => {
    if (!window.confirm("Tem certeza que deseja remover este anexo?")) return;

    setUploading(true);
    try {
      const updatedUrls = (localSurgery.medical_request_urls || []).filter(url => url !== itemToRemove);
      const firstAttachmentUrl = updatedUrls.length > 0 ? (updatedUrls[0].includes('|||') ? updatedUrls[0].split('|||')[0] : updatedUrls[0]) : null;

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

      setLocalSurgery(prev => ({
        ...prev,
        medical_request_urls: updatedUrls,
        attachment_url: firstAttachmentUrl
      }));

      alert('Anexo removido com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao remover anexo: ' + err.message);
    } finally {
      setUploading(false);
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
          attachments.push({ url, name });
        });
      } else if (item.attachment_url) {
        attachments.push({ url: item.attachment_url, name: 'Anexo' });
      }

      const filesToShare = [];
      if (attachments.length > 0) {
        const attachNames = attachments.map(a => a.name);
        text += `*Anexos:* ${attachNames.join(', ')} _(enviado${attachNames.length > 1 ? 's' : ''} em anexo)_\n`;

        const cleanPatient = (item.patient || 'N_A').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        
        // Baixa TODOS os arquivos em PARALELO instantaneamente para não expirar a permissão do clique no celular
        const downloadedFiles = await Promise.all(
          attachments.map(att => downloadFileFromUrl(att.url, `${cleanPatient}_${att.name}`))
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
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao')) return 'status-pending';
    return 'status-default';
  };

  const getLegacyIcon = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('entregue')) return '🟢';
    if (s.includes('suspensa')) return '🔴';
    if (s.includes('em separação') || s.includes('separacao') || s.includes('separação')) return '🔵';
    if (s.includes('separado') || s.includes('entrega')) return '🟠';
    if (s.includes('urgência') || s.includes('urgencia')) return '🟣';
    if (s.includes('aguardando') || s.includes('autorização') || s.includes('autorizacao')) return '🟡';
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
          className="detail-section paste-dropzone" 
          onPaste={isEditable ? handlePasteImages : undefined}
          onFocus={isEditable ? () => setIsDropzoneFocused(true) : undefined}
          onBlur={isEditable ? () => setIsDropzoneFocused(false) : undefined}
          tabIndex={isEditable ? 0 : undefined}
          style={{ 
            marginTop: '24px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            outline: 'none',
            border: isDropzoneFocused ? '2px dashed var(--primary-color, #10b981)' : 'none',
            borderRadius: '8px',
            padding: isDropzoneFocused ? '12px' : '0px',
            boxShadow: isDropzoneFocused ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={20} /> Solicitação Médica / Autorização / Comanda - (Anexos)
            </div>
            
            {isEditable && (
              <div id="details-attachment-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  disabled={uploading}
                  className="btn-primary btn-inserir-anexos"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAttachmentDropdown(!showAttachmentDropdown);
                    setShowDeleteIcons(!showAttachmentDropdown);
                  }}
                  style={{
                    backgroundColor: 'var(--primary-color, #10b981)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    opacity: uploading ? 0.7 : 1
                  }}
                >
                  <Upload size={14} /> {uploading ? 'Enviando...' : 'Inserir Anexos'}
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
                          setShowAttachmentDropdown(false);
                          const el = document.querySelector('.paste-dropzone');
                          if (el) {
                            el.focus();
                            alert("Área de anexos focada! Pressione Ctrl+V no teclado para colar o print.");
                          }
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
          </h3>

          {/* Hidden Inputs for details page */}
          {isEditable && (
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
                style={{ display: 'none' }} 
                onChange={handleGallerySelect} 
              />
              <input 
                type="file" 
                id="file-input-details" 
                accept=".pdf,application/pdf" 
                multiple={false}
                style={{ display: 'none' }} 
                onChange={handleFileDocumentSelect} 
              />
            </>
          )}

          {(() => {
            const allAttachmentUrls = (localSurgery.medical_request_urls && localSurgery.medical_request_urls.length > 0)
              ? localSurgery.medical_request_urls
              : (localSurgery.attachment_url ? [localSurgery.attachment_url] : []);
            
            if (allAttachmentUrls.length === 0) {
              return <p style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic', margin: '8px 0' }}>Nenhum anexo de solicitação ou autorização.</p>;
            }

            return (
              <div id="details-attachment-previews-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
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
                      {isEditable && showDeleteIcons && (
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            removeMedicalRequestUrl(item);
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
                    {isEditable && showDeleteIcons ? (
                      <input
                        type="text"
                        key={`${idx}-${name}`}
                        defaultValue={name}
                        onBlur={(e) => {
                          const newName = e.target.value;
                          if (newName !== name) {
                            handleUpdateFileName(idx, newName, url);
                          }
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
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={22} /> Compartilhar no WhatsApp
              </h3>
              <button 
                onClick={() => setShareModalData(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>
              Cirurgia de <strong>{shareModalData.patient}</strong> possui <strong>{shareModalData.files.length} anexo(s)</strong>. Selecione a opção desejada:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => {
                  const encodedText = encodeURIComponent(shareModalData.text);
                  window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                <MessageCircle size={24} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div>1º Enviar Texto da Cirurgia</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>Envia a mensagem limpa no WhatsApp</div>
                </div>
              </button>

              {shareModalData.files.filter(f => f.type.startsWith('image/')).length > 0 && (
                <button
                  onClick={async () => {
                    const imgFiles = shareModalData.files.filter(f => f.type.startsWith('image/')).map(f => new File([f], f.name, { type: f.type }));
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: imgFiles })) {
                      try {
                        await navigator.share({
                          files: imgFiles,
                          title: `Imagens - ${shareModalData.patient}`,
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <Paperclip size={24} style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div>2º Enviar Texto + Imagens ({shareModalData.files.filter(f => f.type.startsWith('image/')).length})</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>Enviar imagens - Solicitação Médica / Autorização / Comanda</div>
                  </div>
                </button>
              )}

              {shareModalData.files.filter(f => f.type === 'application/pdf').length > 0 && (
                <button
                  onClick={async () => {
                    const pdfFiles = shareModalData.files.filter(f => f.type === 'application/pdf').map(f => new File([f], f.name, { type: f.type }));
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: pdfFiles })) {
                      try {
                        await navigator.share({
                          files: pdfFiles,
                          title: `PDFs - ${shareModalData.patient}`,
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={24} style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div>3º Enviar Texto + PDFs ({shareModalData.files.filter(f => f.type === 'application/pdf').length})</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9, fontWeight: 'normal' }}>
                      Enviar PDF - Solicitação Médica / Autorização / Comanda<br/>
                      <span style={{ fontWeight: 'bold', color: '#ffeb3b' }}>⚠️ Nota: No Android, o texto não é enviado (apenas o arquivo).</span>
                    </div>
                  </div>
                </button>
              )}

              {!/Mobi|Android/i.test(navigator.userAgent) && (
                <button
                  onClick={async () => {
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          text: shareModalData.text,
                          files: shareModalData.files,
                          title: `Cirurgia - ${shareModalData.patient}`
                        });
                        return;
                      } catch (e) {
                        if (e.name === 'AbortError') return;
                      }
                    }
                    
                    const encodedText = encodeURIComponent(shareModalData.text);
                    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-secondary, #f1f5f9)',
                    color: 'var(--text-primary, #334155)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '10px',
                    fontWeight: '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={20} style={{ flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div>Enviar Texto + Anexos Juntos</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Tentativa direta simultânea<br/>
                      <span style={{ color: '#ea580c', fontWeight: 'bold' }}>⚠️ Nota: Utilize esta opção apenas pelo computador.</span>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
