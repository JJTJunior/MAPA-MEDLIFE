import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Save, Trash2, Upload, Image, FileText } from 'lucide-react';

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
  if (!urlStr) return null;
  const url = urlStr.split('|||')[0];
  const parts = url.split('/attachments/');
  return parts.length > 1 ? parts[1] : null;
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
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
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

export default function SurgeryModal({ isOpen, onClose, surgery, user, onSaveSuccess }) {
  const [formData, setFormData] = useState({
    status: '',
    status_color: '',
    date: '',
    time: '',
    doctor: '',
    hospital: '',
    patient: '',
    insurance: '',
    material_procedure: '',
    observation: '',
    surgery_code: '',
    opme_checked: false,
    cme_checked: false,
    bloco_checked: false,
    pos_checked: false,
    instrumentalist1: '',
    instrumentalist2: '',
    salesperson: '',
    surgery_type: ''
  });

  const [loading, setLoading] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [isDropzoneFocused, setIsDropzoneFocused] = useState(false);
  const isEditable = user.permissions?.can_view_only ? false : (user.permissions?.can_edit ?? (user.role === 'Admin' || user.role === 'Gerente'));
  const canCreate = user.permissions?.can_view_only ? false : (user.permissions?.allowed_edit_fields?.includes('create_surgery') ?? isEditable);
  
  const isFieldEditable = (fieldName) => {
    if (!isEditable) return false;
    if (user.role === 'Admin' || user.role === 'Gerente') return true;
    const allowed = user.permissions?.allowed_edit_fields;
    if (allowed && Array.isArray(allowed)) {
      return allowed.includes(fieldName);
    }
    return true; // Default to true if not explicitly restricted
  };

  const [vendedoresList, setVendedoresList] = useState([]);
  const [instrumentadoresList, setInstrumentadoresList] = useState([]);
  const [hospitaisList, setHospitaisList] = useState([]);
  const [conveniosList, setConveniosList] = useState([]);
  const [procedimentosList, setProcedimentosList] = useState([]);
  const [surgeryTypesList, setSurgeryTypesList] = useState([]);
  const [medicosList, setMedicosList] = useState([]);
  const [statusList, setStatusList] = useState([
    { name: 'Material entregue' },
    { name: 'Em separação' },
    { name: 'Separado para entrega' },
    { name: 'Aguardando autorização' },
    { name: 'Urgência' },
    { name: 'Suspensa' }
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchLists();
    }
  }, [isOpen]);

  const fetchLists = async () => {
    try {
      const [vendedoresRes, instrumentadoresRes, hospRes, convRes, procRes, statusRes, typesRes, medicosRes] = await Promise.all([
        supabase.from('vendedores').select('name').order('name', { ascending: true }),
        supabase.from('instrumentadores').select('name').order('name', { ascending: true }),
        supabase.from('hospitais').select('name').order('name', { ascending: true }),
        supabase.from('convenios').select('name').order('name', { ascending: true }),
        supabase.from('procedimentos').select('name').order('name', { ascending: true }),
        supabase.from('status').select('name').order('name', { ascending: true }),
        supabase.from('surgery_types').select('name').order('name', { ascending: true }),
        supabase.from('medicos').select('name').order('name', { ascending: true })
      ]);
      if (vendedoresRes.data) setVendedoresList(vendedoresRes.data);
      if (instrumentadoresRes.data) setInstrumentadoresList(instrumentadoresRes.data);
      if (hospRes.data) setHospitaisList(hospRes.data);
      if (convRes.data) setConveniosList(convRes.data);
      if (procRes.data) setProcedimentosList(procRes.data);
      if (typesRes && typesRes.data) setSurgeryTypesList(typesRes.data);
      if (statusRes && statusRes.data && statusRes.data.length > 0) {
        const fetchedStatuses = statusRes.data.map(s => {
          if (s.name.includes('|')) {
            const [icon, name] = s.name.split('|');
            return { icon, name };
          }
          return { icon: '⚪', name: s.name };
        });
        fetchedStatuses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setStatusList(fetchedStatuses);
      } else {
        const fallbackStatuses = [
          { icon: '🟡', name: 'AGUARDANDO AUTORIZAÇÃO' },
          { icon: '⚪', name: 'ELETIVA' },
          { icon: '🔵', name: 'EM SEPARAÇÃO' },
          { icon: '🟢', name: 'MATERIAL ENTREGUE' },
          { icon: '🟠', name: 'SEPARADO PARA ENTREGAR' },
          { icon: '🔴', name: 'SUSPENSA' },
          { icon: '🟣', name: 'URGÊNCIA' }
        ];
        fallbackStatuses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setStatusList(fallbackStatuses);
      }
      
      const medicosData = medicosRes?.data;
      if (medicosData) {
        const uniqueMedicos = medicosData.map(item => item.name).filter(Boolean);
        setMedicosList(uniqueMedicos);
      }
    } catch (err) {
      console.error('Erro ao buscar listas:', err);
    }
  };

  useEffect(() => {
    if (surgery) {
      let currentStatus = surgery.status || 'MATERIAL ENTREGUE';
      
      // Normalização amigável de status antigos para a nova lista dinâmica
      if (statusList.length > 0) {
        const exact = statusList.find(s => s.name === currentStatus);
        if (!exact) {
           const caseMatch = statusList.find(s => s.name.toUpperCase() === currentStatus.toUpperCase());
           if (caseMatch) {
             currentStatus = caseMatch.name;
           } else if (currentStatus.toUpperCase().includes('SEPARADO PARA ENTREGA')) {
             const fix = statusList.find(s => s.name.toUpperCase().includes('SEPARADO PARA ENTREGAR'));
             if (fix) currentStatus = fix.name;
           }
        }
      }

      let matchingColor = surgery.delivery_status;
      if (statusList.length > 0) {
        const found = statusList.find(s => s.name === currentStatus);
        if (found) matchingColor = found.icon;
      }

      setFormData({
        status: currentStatus,
        status_color: matchingColor || '🟢',
        date: surgery.date || '',
        time: surgery.time || '',
        doctor: surgery.doctor || '',
        hospital: surgery.hospital || '',
        patient: surgery.patient || '',
        insurance: surgery.insurance || '',
        material_procedure: surgery.material_procedure || '',
        observation: surgery.observation || '',
        surgery_code: surgery.surgery_code || '',
        opme_checked: !!surgery.opme_checked,
        cme_checked: !!surgery.cme_checked,
        bloco_checked: !!surgery.bloco_checked,
        pos_checked: !!surgery.pos_checked,
        instrumentalist1: surgery.instrumentalist1 || '',
        instrumentalist2: surgery.instrumentalist2 || '',
        salesperson: surgery.salesperson || '',
        surgery_type: surgery.surgery_type || '',
        medical_request_urls: (surgery.medical_request_urls && surgery.medical_request_urls.length > 0) ? surgery.medical_request_urls : (surgery.attachment_url ? [surgery.attachment_url] : [])
      });
    } else {
      // Novo registro
      setFormData({
        status: '',
        status_color: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        doctor: '',
        hospital: '',
        patient: '',
        insurance: '',
        material_procedure: '',
        observation: '',
        surgery_code: '',
        opme_checked: false,
        cme_checked: false,
        bloco_checked: false,
        pos_checked: false,
        instrumentalist1: '',
        instrumentalist2: '',
        salesperson: user.role === 'Vendedor' ? user.email.split('@')[0].toUpperCase() : '',
        surgery_type: '',
        medical_request_urls: []
      });
    }
  }, [surgery, isOpen, statusList]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;
    
    if (name === 'surgery_code' && typeof finalValue === 'string') {
      finalValue = finalValue.replace(/\D/g, '');
    } else if (typeof finalValue === 'string' && type !== 'date' && type !== 'time') {
      // Força letras maiúsculas e remove acentos em todos os campos de texto
      finalValue = finalValue.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    const selected = statusList.find(s => s.name === status);
    const color = selected ? selected.icon : '';

    setFormData(prev => ({
      ...prev,
      status,
      status_color: color
    }));
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

  const uploadAndAddFile = async (file, shouldCompress = false) => {
    const displayName = prompt("Digite o nome/identificação para este anexo (ex: Solicitação, Autorização):");
    const printName = displayName ? displayName.trim() : "";

    setLoading(true);
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

      setFormData(prev => ({
        ...prev,
        medical_request_urls: [...(prev.medical_request_urls || []), valueToStore]
      }));
    } catch (err) {
      console.error(err);
      alert('Erro ao fazer upload da imagem: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeMedicalRequestUrl = (urlToRemove) => {
    setFormData(prev => ({
      ...prev,
      medical_request_urls: (prev.medical_request_urls || []).filter(url => url !== urlToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (surgery?.id) {
      if (!isEditable) return;
    } else {
      if (!canCreate) return;
    }

    if (!formData.status || formData.status.trim() === '') {
      alert('Por favor, selecione o status do agendamento.');
      return;
    }

    if (formData.time && formData.time.trim() !== '') {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(formData.time.trim())) {
        alert('O horário da cirurgia deve estar no formato correto de horas (HH:MM). Exemplo: 12:00, 08:30');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        delivery_status: formData.status_color
      };
      
      const firstAttachmentUrl = payload.medical_request_urls && payload.medical_request_urls.length > 0 ? (payload.medical_request_urls[0].includes('|||') ? payload.medical_request_urls[0].split('|||')[0] : payload.medical_request_urls[0]) : null;
      payload.attachment_url = firstAttachmentUrl;

      // Limpar strings vazias que causam erro no banco (ex: colunas DATE)
      if (payload.date === '') payload.date = null;
      if (payload.time === '') payload.time = null;

      if (surgery?.id) {
        // Excluir fisicamente os anexos que foram removidos pelo usuário na edição
        const originalUrls = surgery.medical_request_urls || [];
        const newUrls = formData.medical_request_urls || [];
        
        const removedUrls = originalUrls.filter(url => !newUrls.includes(url));
        const filesToDelete = removedUrls.map(extractFilename).filter(name => name !== null);
        
        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('attachments')
            .remove(filesToDelete);
          if (storageError) console.error('Erro ao excluir arquivos antigos:', storageError);
        }

        // Atualizar
        const { error } = await supabase
          .from('surgeries')
          .update(payload)
          .eq('id', surgery.id);

        if (error) throw error;
      } else {
        // Criar
        const { error } = await supabase
          .from('surgeries')
          .insert([payload]);

        if (error) throw error;
      }

      alert('SALVO COM SUCESSO');
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      alert(`Erro ao salvar agendamento. Verifique os dados.\nDetalhes: ${err.message || err.details || ''}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta cirurgia?')) return;
    setLoading(true);
    try {
      // Remover arquivos fisicamente do Supabase Storage
      if (surgery?.medical_request_urls && surgery.medical_request_urls.length > 0) {
        const filesToDelete = surgery.medical_request_urls
          .map(extractFilename)
          .filter(name => name !== null);
          
        if (filesToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('attachments')
            .remove(filesToDelete);
          if (storageError) console.error('Erro ao excluir arquivos:', storageError);
        }
      }

      const { error } = await supabase.from('surgeries').delete().eq('id', surgery.id);
      if (error) throw error;
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir cirurgia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2 className="modal-title">
            {surgery ? (isEditable ? 'Editar Agendamento' : 'Visualizar Agendamento') : 'Agendar Nova Cirurgia'}
          </h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>Campos marcados com asterisco (*) são obrigatórios.</p>
          <div className="form-grid">
            {/* Informações Básicas */}
            <div className="form-group">
              <label className="form-label">Paciente *</label>
              <input
                type="text"
                name="patient"
                className="form-input"
                required
                disabled={!isFieldEditable('patient')}
                value={formData.patient}
                onChange={handleChange}
                placeholder="Nome do paciente"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Médico *</label>
              <select
                name="doctor"
                className="form-input"
                required
                disabled={!isFieldEditable('doctor')}
                value={formData.doctor}
                onChange={handleChange}
              >
                <option value="">Selecione um médico</option>
                {medicosList.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
                {formData.doctor && !medicosList.includes(formData.doctor) && (
                  <option value={formData.doctor}>{formData.doctor} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Hospital *</label>
              <select
                name="hospital"
                className="form-input"
                required
                disabled={!isFieldEditable('hospital')}
                value={formData.hospital}
                onChange={handleChange}
              >
                <option value="">Selecione um hospital</option>
                {hospitaisList.map((h, idx) => (
                  <option key={idx} value={h.name}>{h.name}</option>
                ))}
                {formData.hospital && !hospitaisList.find(h => h.name === formData.hospital) && (
                  <option value={formData.hospital}>{formData.hospital} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Convênio *</label>
              <select
                name="insurance"
                className="form-input"
                required
                disabled={!isFieldEditable('health_insurance')}
                value={formData.insurance}
                onChange={handleChange}
              >
                <option value="">Selecione um convênio</option>
                {conveniosList.map((c, idx) => (
                  <option key={idx} value={c.name}>{c.name}</option>
                ))}
                {formData.insurance && !conveniosList.find(c => c.name === formData.insurance) && (
                  <option value={formData.insurance}>{formData.insurance} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Data da Cirurgia</label>
              <input
                type="date"
                name="date"
                className="form-input"
                disabled={!isFieldEditable('date')}
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Hora da Cirurgia</label>
              <input
                type="time"
                name="time"
                className="form-input"
                disabled={!isFieldEditable('time')}
                value={formData.time}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Cirurgia *</label>
              <select
                name="surgery_type"
                className="form-input"
                required
                disabled={!isFieldEditable('surgery_type')}
                value={formData.surgery_type}
                onChange={handleChange}
              >
                <option value="">Selecione um tipo</option>
                {surgeryTypesList.map((st, idx) => (
                  <option key={idx} value={st.name}>{st.name}</option>
                ))}
                {formData.surgery_type && !surgeryTypesList.find(st => st.name === formData.surgery_type) && (
                  <option value={formData.surgery_type}>{formData.surgery_type} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Codigo do Sistema - (Spica)</label>
              <input
                type="text"
                name="surgery_code"
                className="form-input"
                disabled={!isFieldEditable('surgery_code')}
                value={formData.surgery_code}
                onChange={handleChange}
                placeholder="Digite apenas números"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instrumentador 1 *</label>
              <select
                name="instrumentalist1"
                className="form-input"
                required
                disabled={!isFieldEditable('instrumentalist1')}
                value={formData.instrumentalist1}
                onChange={handleChange}
              >
                <option value="">Selecione um instrumentador</option>
                {instrumentadoresList.map((i, idx) => (
                  <option key={idx} value={i.name}>{i.name}</option>
                ))}
                {formData.instrumentalist1 && !instrumentadoresList.find(i => i.name === formData.instrumentalist1) && (
                  <option value={formData.instrumentalist1}>{formData.instrumentalist1} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Instrumentador 2</label>
              <select
                name="instrumentalist2"
                className="form-input"
                disabled={!isFieldEditable('instrumentalist2')}
                value={formData.instrumentalist2}
                onChange={handleChange}
              >
                <option value="">Selecione um instrumentador (opcional)</option>
                {instrumentadoresList.map((i, idx) => (
                  <option key={idx} value={i.name}>{i.name}</option>
                ))}
                {formData.instrumentalist2 && !instrumentadoresList.find(i => i.name === formData.instrumentalist2) && (
                  <option value={formData.instrumentalist2}>{formData.instrumentalist2} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Vendedor Responsável *</label>
              <select
                name="salesperson"
                className="form-input"
                required
                disabled={!isFieldEditable('salesperson') && user.role !== 'Vendedor'}
                value={formData.salesperson}
                onChange={handleChange}
              >
                <option value="">Selecione um vendedor</option>
                {vendedoresList.map((v, idx) => (
                  <option key={idx} value={v.name}>{v.name}</option>
                ))}
                {/* Fallback caso o registro tenha um nome que foi deletado */}
                {formData.salesperson && !vendedoresList.find(v => v.name === formData.salesperson) && (
                  <option value={formData.salesperson}>{formData.salesperson} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Material Autorizado / Procedimento</label>
              <input
                type="text"
                name="material_procedure"
                className="form-input"
                disabled={!isFieldEditable('material')}
                value={formData.material_procedure}
                onChange={handleChange}
                placeholder="Digite o material autorizado ou procedimento"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status do Agendamento *</label>
              <select
                className="form-input"
                required
                disabled={!isFieldEditable('status')}
                value={formData.status || ''}
                onChange={handleStatusChange}
              >
                <option value="">Selecione um status</option>
                {statusList.map((st, idx) => (
                  <option key={idx} value={st.name}>
                    {st.icon} {st.name}
                  </option>
                ))}
                {/* Fallback if legacy status is not in the list */}
                {formData.status && !statusList.find(s => s.name === formData.status) && (
                  <option value={formData.status}>⚪ {formData.status} (Legado)</option>
                )}
              </select>
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label">Observações</label>
              <textarea
                name="observation"
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                disabled={!isFieldEditable('observation')}
                value={formData.observation}
                onChange={handleChange}
                placeholder="Detalhes sobre a entrega, urgência, ou justificativa de suspensão..."
              />
            </div>

            <div className="form-group form-grid-full">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Image size={16} /> Solicitação Médica / Autorização / Comanda - (Anexos)
              </label>
              <div 
                onPaste={handlePasteImages}
                onFocus={() => setIsDropzoneFocused(true)}
                onBlur={() => setIsDropzoneFocused(false)}
                className="paste-dropzone"
                style={{
                  border: isDropzoneFocused ? '2px dashed var(--primary-color, #10b981)' : '2px dashed var(--border-color, var(--border-glass))',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary, var(--bg-primary))',
                  minHeight: '110px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  outline: 'none',
                  boxShadow: isDropzoneFocused ? '0 0 0 3px rgba(16, 185, 129, 0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
                tabIndex={0}
              >
                {/* Dropdown Button Wrapper */}
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAttachmentDropdown(!showAttachmentDropdown);
                    }}
                    className="btn-primary"
                    style={{
                      backgroundColor: 'var(--primary-color, #10b981)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Upload size={16} /> Inserir Anexos
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
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'var(--bg-secondary, var(--bg-primary))',
                          border: '1px solid var(--border-color, var(--border-glass))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          minWidth: '220px',
                          zIndex: 1000
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAttachmentDropdown(false);
                            const el = document.getElementById('camera-input');
                            if (el) el.click();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary, var(--text-primary))',
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
                            const el = document.getElementById('gallery-input');
                            if (el) el.click();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary, var(--text-primary))',
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
                            const el = document.getElementById('file-input');
                            if (el) el.click();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '10px 12px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: 'var(--text-primary, var(--text-primary))',
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
                            color: 'var(--text-primary, var(--text-primary))',
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

                {/* Hidden Inputs */}
                <input 
                  type="file" 
                  id="camera-input" 
                  accept="image/*" 
                  capture="environment" 
                  style={{ display: 'none' }} 
                  onChange={handleCameraSelect} 
                />
                <input 
                  type="file" 
                  id="gallery-input" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleGallerySelect} 
                />
                <input 
                  type="file" 
                  id="file-input" 
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }} 
                  onChange={handleFileDocumentSelect} 
                />

                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, var(--text-secondary))', fontWeight: '500' }}>
                  Selecione uma opção acima ou **clique aqui e aperte Ctrl+V** para colar anexos
                </span>
              </div>
              
              {/* Previews */}
              {(() => {
                const allAttachmentUrls = (formData.medical_request_urls && formData.medical_request_urls.length > 0)
                  ? formData.medical_request_urls
                  : (formData.attachment_url ? [formData.attachment_url] : []);
                
                if (allAttachmentUrls.length === 0) return null;

                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                    {allAttachmentUrls.map((item, index) => {
                      const { url, name } = parsePrintUrl(item);
                      return (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '110px', gap: '6px' }}>
                        <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color, var(--border-glass))' }}>
                          {isDocumentFile(url) ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-glass)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
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
                              <img src={url} alt={name || `print-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                            </a>
                          )}
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
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '12px',
                              lineHeight: '1',
                              fontWeight: 'bold',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }}
                            title="Remover anexo"
                          >
                            ×
                          </button>
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            const updatedUrls = [...formData.medical_request_urls];
                            updatedUrls[index] = newName ? `${url}|||${newName}` : url;
                            setFormData(prev => ({
                              ...prev,
                              medical_request_urls: updatedUrls
                            }));
                          }}
                          placeholder="Identificação..."
                          style={{
                            width: '100px',
                            fontSize: '0.75rem',
                            padding: '4px 6px',
                            border: '1px solid var(--border-color, var(--border-glass))',
                            borderRadius: '6px',
                            textAlign: 'center',
                            background: 'var(--bg-primary, #fff)',
                            color: 'var(--text-primary, var(--text-primary))'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

            {/* Checklist de Entregas */}
            <div className="checklist-section">
              <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>Checklist de Status e Entrega</h3>
              <div className="checklist-grid">
                <label className={`custom-checkbox-label ${formData.opme_checked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    name="opme_checked"
                    disabled={!isFieldEditable('opme')}
                    checked={formData.opme_checked}
                    onChange={handleChange}
                  />
                  <span>OPME</span>
                </label>

                <label className={`custom-checkbox-label ${formData.cme_checked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    name="cme_checked"
                    disabled={!isFieldEditable('cme')}
                    checked={formData.cme_checked}
                    onChange={handleChange}
                  />
                  <span>CME</span>
                </label>

                <label className={`custom-checkbox-label ${formData.bloco_checked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    name="bloco_checked"
                    disabled={!isFieldEditable('bloco')}
                    checked={formData.bloco_checked}
                    onChange={handleChange}
                  />
                  <span>BLOCO</span>
                </label>

                <label className={`custom-checkbox-label ${formData.pos_checked ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    name="pos_checked"
                    disabled={!isFieldEditable('pos')}
                    checked={formData.pos_checked}
                    onChange={handleChange}
                  />
                  <span>Pós-Cirurgia</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              {isEditable && surgery && isFieldEditable('delete') && (
                <button type="button" className="btn-secondary" onClick={handleDelete} style={{ color: '#ef4444', borderColor: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                  <Trash2 size={18} />
                  Excluir
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                {isEditable ? 'Cancelar' : 'Fechar'}
              </button>
              {isEditable && (
                <button type="submit" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={loading}>
                  <Save size={18} />
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
