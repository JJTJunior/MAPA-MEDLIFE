import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Clock, Camera, Plus, Check, X, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import DocumentScanner from './DocumentScanner';

const isDocumentFile = (url) => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.docx');
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

const DriverPanel = ({ user }) => {
  const [surgeries, setSurgeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today'); // today, yesterday, last7, all, custom
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // all, pending, delivered
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // { surgeryId, items: [], currentIndex: number }
  const [uploadOptionsModal, setUploadOptionsModal] = useState(null); // { surgeryId }
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachmentNameInput, setAttachmentNameInput] = useState('');
  const [attachmentNameError, setAttachmentNameError] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  
  const parsePrintUrl = (item) => {
    if (!item) return { url: '', name: '' };
    let cleanItem = item;
    
    // Support old formats if any
    if (cleanItem.startsWith('[ANEXO_3]|||')) {
      cleanItem = cleanItem.replace('[ANEXO_3]|||', '');
      if (!cleanItem.includes('?anexo=3')) {
        const parts = cleanItem.split('|||');
        if (parts[0]) parts[0] = parts[0] + '?anexo=3';
        cleanItem = parts.join('|||');
      }
    }
    
    if (cleanItem.includes('|||')) {
      const parts = cleanItem.split('|||');
      let userName = null;
      let nameParts = [];
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].startsWith('UPLOADED_BY:')) {
          userName = parts[i].replace('UPLOADED_BY:', '');
        } else {
          nameParts.push(parts[i]);
        }
      }
      return { url: parts[0], name: nameParts.join('|||'), userName };
    }
    return { url: cleanItem, name: '', userName: null };
  };
  
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState(null);

  const handleOpenImage = (surgeryId, items, currentIndex) => {
    setSelectedImage({ surgeryId, items, currentIndex });
  };

  useEffect(() => {
    fetchSurgeries();
  }, [dateFilter, customDate]);

  useEffect(() => {
    const channel = supabase
      .channel('driver_surgeries_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'surgeries' }, (payload) => {
        setSurgeries(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'surgeries' }, () => {
        fetchSurgeries();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'surgeries' }, (payload) => {
        setSurgeries(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getLocalDateRange = (filter) => {
    const now = new Date();
    const brTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    brTime.setHours(0, 0, 0, 0);

    const pad = (n) => n.toString().padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let start, end;

    if (filter === 'today') {
      start = formatDate(brTime);
      end = start;
    } else if (filter === 'yesterday') {
      const yesterday = new Date(brTime);
      yesterday.setDate(yesterday.getDate() - 1);
      start = formatDate(yesterday);
      end = start;
    } else if (filter === 'last7') {
      const last7 = new Date(brTime);
      last7.setDate(last7.getDate() - 7);
      start = formatDate(last7);
      end = formatDate(brTime);
    } else if (filter === 'custom' && customDate) {
      start = customDate;
      end = customDate;
    } else {
      // all
      return { start: null, end: null };
    }
    return { start, end };
  };

  const fetchSurgeries = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('surgeries')
        .select('*')
        .in('status', ['Separado para entrega', 'Separado para entregar', 'SEPARADO PARA ENTREGA', 'SEPARADO PARA ENTREGAR', 'Material entregue', 'MATERIAL ENTREGUE']);

      const { start, end } = getLocalDateRange(dateFilter);
      if (start && end) {
        if (start === end) {
          query = query.eq('date', start);
        } else {
          query = query.gte('date', start).lte('date', end);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort by time/date
      data.sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(a.date) - new Date(b.date);
        }
        return (a.time || '23:59').localeCompare(b.time || '23:59');
      });
      
      setSurgeries(data || []);
    } catch (err) {
      console.error('Error fetching surgeries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedSurgeryId) return;
    setAttachmentNameInput('');
    setAttachmentNameError('');
    setPendingAttachment({ files: Array.from(files), surgeryId: selectedSurgeryId, isPdfScan: false });
  };

  const handlePdfScanFinish = async (pdfBlob) => {
    setShowScanner(false);
    if (!selectedSurgeryId) return;
    setAttachmentNameInput('');
    setAttachmentNameError('');
    setPendingAttachment({ files: [pdfBlob], surgeryId: selectedSurgeryId, isPdfScan: true });
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

    const files = item.files;
    const surgeryId = item.surgeryId;

    try {
      setUploadingId(surgeryId);
      setUploadProgress({
        current: 0,
        total: files.length,
        fileName: nameToUse,
        percent: 5,
        status: `Preparando ${files.length} arquivo(s)...`,
        isDone: false
      });

      const uploaderName = user?.name || user?.email || 'Desconhecido';
      const surgeryToUpdate = surgeries.find(s => s.id === surgeryId);
      const existingUrls = surgeryToUpdate?.comanda_urls || [];
      const newValuesToStore = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const displayName = files.length > 1 ? `${nameToUse} (${i + 1})` : nameToUse;
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
        if (!item.isPdfScan && file.type && file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file, 1200, 1200, 0.7);
        }

        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : (item.isPdfScan ? 'pdf' : 'png');
        const fileName = `anexo3_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}.${fileExt}`;

        const uploadOptions = item.isPdfScan ? { contentType: 'application/pdf' } : undefined;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload, uploadOptions);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const valueToStore = `${publicUrl}?anexo=3|||${displayName}|||UPLOADED_BY:${uploaderName}`;
        newValuesToStore.push(valueToStore);
      }

      setUploadProgress({
        current: files.length,
        total: files.length,
        fileName: 'Atualizando registro...',
        percent: 95,
        status: 'Salvando alterações no banco de dados...',
        isDone: false
      });

      const updatedUrls = [...existingUrls, ...newValuesToStore];

      const { error: updateError } = await supabase.from('surgeries')
        .update({ 
          comanda_urls: updatedUrls
        })
        .eq('id', surgeryId);

      if (updateError) throw updateError;

      // Update local state
      setSurgeries(prev => prev.map(s => {
        if (s.id === surgeryId) {
          return { ...s, comanda_urls: updatedUrls };
        }
        return s;
      }));

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
      console.error('Erro no upload:', err);
      alert('Erro ao enviar comprovante: ' + err.message);
      setUploadProgress(null);
    } finally {
      setUploadingId(null);
      setSelectedSurgeryId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (surgeryId, fullString) => {
    if (!window.confirm('Tem certeza que deseja excluir este anexo?')) return;
    
    try {
      const surgeryToUpdate = surgeries.find(s => s.id === surgeryId);
      if (!surgeryToUpdate) return;
      
      const updatedUrls = (surgeryToUpdate.comanda_urls || []).filter(item => item !== fullString);
      
      const hasAnexo3 = updatedUrls.some(item => item.includes('?anexo=3') || item.startsWith('[ANEXO_3]|||'));
      
      let updatePayload = { comanda_urls: updatedUrls };
      if (!hasAnexo3) {
        updatePayload.status = 'SEPARADO PARA ENTREGAR';
        updatePayload.delivery_status = '🟠';
      }

      const { error } = await supabase.from('surgeries')
        .update(updatePayload)
        .eq('id', surgeryId);
        
      if (error) throw error;
      
      setSurgeries(prev => prev.map(s => {
        if (s.id === surgeryId) {
          return { ...s, ...updatePayload };
        }
        return s;
      }));
      setSelectedImage(null); // Close modal on delete
    } catch (err) {
      console.error('Erro ao excluir anexo:', err);
      alert('Erro ao excluir anexo: ' + err.message);
    }
  };

  const handleFinalizeDelivery = async (surgeryId) => {
    if (!window.confirm('Tem certeza que deseja finalizar a entrega deste material?')) return;
    
    try {
      const { error } = await supabase.from('surgeries')
        .update({ 
          status: 'MATERIAL ENTREGUE',
          delivery_status: '🟢'
        })
        .eq('id', surgeryId);
        
      if (error) throw error;
      
      setSurgeries(prev => prev.map(s => {
        if (s.id === surgeryId) {
          return { ...s, status: 'MATERIAL ENTREGUE', delivery_status: '🟢' };
        }
        return s;
      }));
    } catch (err) {
      console.error('Erro ao finalizar entrega:', err);
      alert('Erro ao finalizar entrega: ' + err.message);
    }
  };

  const openFilePicker = (id) => {
    setUploadOptionsModal({ surgeryId: id });
  };

  const searchedSurgeries = surgeries.filter(s => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (s.patient?.toLowerCase().includes(search) || 
            s.hospital?.toLowerCase().includes(search) ||
            s.doctor?.toLowerCase().includes(search));
  });

  const pendingCount = searchedSurgeries.filter(s => {
    const st = s.status ? s.status.toUpperCase() : '';
    return st === 'SEPARADO PARA ENTREGA' || st === 'SEPARADO PARA ENTREGAR';
  }).length;
  
  const deliveredCount = searchedSurgeries.filter(s => {
    const st = s.status ? s.status.toUpperCase() : '';
    return st === 'MATERIAL ENTREGUE';
  }).length;
  
  const totalCount = searchedSurgeries.length;

  const filteredSurgeries = searchedSurgeries.filter(s => {
    const st = s.status ? s.status.toUpperCase() : '';
    const isPending = st === 'SEPARADO PARA ENTREGA' || st === 'SEPARADO PARA ENTREGAR';
    const isDelivered = st === 'MATERIAL ENTREGUE';
    
    if (statusFilter === 'pending') return isPending;
    if (statusFilter === 'delivered') return isDelivered;
    return true;
  });

  const getDayName = () => {
    const now = new Date();
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
  };

  return (
    <div className="mobile-edge-to-edge" style={{ backgroundColor: 'var(--bg-glass)', minHeight: '100%', paddingBottom: '80px', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Header section (Dark Teal) */}
      <div style={{ 
        backgroundColor: '#0f4c5c', 
        color: 'white', 
        padding: '24px 20px', 
        borderBottomLeftRadius: '20px', 
        borderBottomRightRadius: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Entregas de Materiais</h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>{getDayName()}</p>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div 
            onClick={() => setStatusFilter('all')}
            style={{ flex: 1, backgroundColor: statusFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', border: statusFilter === 'all' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{totalCount}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', marginTop: '6px', opacity: 0.9 }}>PACIENTES</div>
          </div>
          <div 
            onClick={() => setStatusFilter('pending')}
            style={{ flex: 1, backgroundColor: statusFilter === 'pending' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', border: statusFilter === 'pending' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', marginTop: '6px', opacity: 0.9 }}>PENDENTES</div>
          </div>
          <div 
            onClick={() => setStatusFilter('delivered')}
            style={{ flex: 1, backgroundColor: statusFilter === 'delivered' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', border: statusFilter === 'delivered' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{deliveredCount}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', marginTop: '6px', opacity: 0.9 }}>ENTREGUES</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ padding: '20px 4px' }}>
        <input
          type="text"
          placeholder="Buscar paciente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-glass)',
            outline: 'none',
            fontSize: '0.95rem',
            marginBottom: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        />

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {[
            { id: 'today', label: 'Hoje' },
            { id: 'yesterday', label: 'Ontem' },
            { id: 'last7', label: 'Últimos 7 dias' },
            { id: 'all', label: 'Todos' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setDateFilter(f.id); setCustomDate(''); }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: dateFilter === f.id ? '#0f4c5c' : 'var(--border-glass)',
                backgroundColor: dateFilter === f.id ? '#0f4c5c' : 'var(--bg-secondary)',
                color: dateFilter === f.id ? 'var(--bg-secondary)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: '12px', position: 'relative' }}>
          <Calendar size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="date" 
            className="form-input"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDateFilter('custom');
            }}
            style={{ 
              width: '100%', 
              paddingLeft: '36px',
              paddingRight: '16px',
              height: '46px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-glass)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              fontFamily: 'inherit',
              appearance: 'none',
              WebkitAppearance: 'none'
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando entregas...</div>
        ) : filteredSurgeries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Nenhuma entrega encontrada.</div>
        ) : (
          filteredSurgeries.map((surgery) => {
            const st = surgery.status ? surgery.status.toUpperCase() : '';
            const isDelivered = st === 'MATERIAL ENTREGUE';
            
            // Get the first image url from comanda_urls to show as thumbnail if delivered
            let firstThumbnail = null;
            if (isDelivered && surgery.comanda_urls && surgery.comanda_urls.length > 0) {
              const parts = surgery.comanda_urls[0].split('|||');
              firstThumbnail = parts[0];
            }

            // format date
            let displayDate = surgery.date;
            if (displayDate) {
              const d = new Date(displayDate + 'T00:00:00');
              const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
              displayDate = `${d.getDate()} ${months[d.getMonth()]}`;
            }

            // Get anexo 3 items
            const anexo3Items = (surgery.comanda_urls || []).filter(item => item && (item.includes('?anexo=3') || item.includes('[ANEXO_3]')));
          
            let deliveredBy = null;
            if (anexo3Items.length > 0) {
              const parsedLast = parsePrintUrl(anexo3Items[anexo3Items.length - 1]);
              if (parsedLast.userName) deliveredBy = parsedLast.userName;
            }

            return (
              <div key={surgery.id} style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '16px', 
                padding: '20px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                border: '1px solid var(--bg-glass)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
                  <div style={{ width: '100%' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px' }}>PACIENTE</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-word' }}>{surgery.patient}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HOSPITAL</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <span style={{ color: '#94a3b8', marginTop: '2px' }}>♡</span> <span style={{ wordBreak: 'break-word' }}>{surgery.hospital}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>MÉDICO</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500', wordBreak: 'break-word' }}>{surgery.doctor}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>DATA</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="var(--text-secondary)" /> {displayDate || '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>VENDEDOR</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>{surgery.salesperson || '--'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HORA</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="var(--text-secondary)" /> {surgery.time || '--'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '16px' }}>
                  <span 
                    className={`status-badge ${isDelivered ? 'status-delivered' : 'status-ready'}`} 
                    style={{ padding: '6px 12px', whiteSpace: 'normal', textAlign: 'left' }}
                  >
                    {isDelivered ? '🟢 MATERIAL ENTREGUE' : '🟠 SEPARADO PARA ENTREGAR'}
                  </span>
                  {isDelivered && deliveredBy && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', marginLeft: '4px' }}>
                      por {deliveredBy}
                    </div>
                  )}
                </div>

                {/* Render Attachments */}
                {anexo3Items.length > 0 && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {anexo3Items.map((itemStr, idx) => {
                      const parsed = parsePrintUrl(itemStr);
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                          <div 
                            onClick={() => handleOpenImage(surgery.id, anexo3Items, idx)}
                            style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-glass)', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-glass)' }}
                          >
                            {isDocumentFile(parsed.url) ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <FileText size={20} style={{ color: parsed.url.toLowerCase().includes('.pdf') ? '#ef4444' : '#3b82f6' }} />
                                <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: parsed.url.toLowerCase().includes('.pdf') ? '#ef4444' : '#3b82f6' }}>
                                  {parsed.url.toLowerCase().includes('.pdf') ? 'PDF' : 'WORD'}
                                </span>
                              </div>
                            ) : (
                              <img src={parsed.url} alt={parsed.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }} title={parsed.name || `Anexo ${idx + 1}`}>
                            {parsed.name || `Anexo ${idx + 1}`}
                          </div>
                        </div>
                      );
                    })}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                      <button 
                        onClick={() => openFilePicker(surgery.id)}
                        disabled={uploadingId === surgery.id}
                        style={{ 
                          width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed var(--border-glass)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)',
                          cursor: 'pointer', color: '#0f4c5c', minWidth: '60px', padding: 0
                        }}
                      >
                        <Plus size={20} />
                      </button>
                      <div style={{ fontSize: '0.55rem', color: 'transparent' }}>+</div>
                    </div>
                  </div>
                )}

                {isDelivered ? (
                  <button 
                    onClick={() => openFilePicker(surgery.id)}
                    disabled={uploadingId === surgery.id}
                    style={{
                      width: '100%', padding: '12px', backgroundColor: 'var(--bg-glass)', color: '#0f4c5c',
                      borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    <Camera size={18} /> {uploadingId === surgery.id ? 'Enviando...' : 'Ver / adicionar fotos'}
                  </button>
                ) : anexo3Items.length > 0 ? (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleFinalizeDelivery(surgery.id)}
                      disabled={uploadingId === surgery.id}
                      style={{
                        flex: 2, padding: '14px', backgroundColor: '#10b981', color: 'white',
                        borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', transition: 'background-color 0.2s',
                        boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <Check size={18} /> Finalizar Entrega
                    </button>
                    <button 
                      onClick={() => openFilePicker(surgery.id)}
                      disabled={uploadingId === surgery.id}
                      style={{
                        flex: 1, padding: '14px', backgroundColor: 'var(--bg-glass)', color: '#0f4c5c',
                        borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer', transition: 'background-color 0.2s'
                      }}
                    >
                      <Camera size={18} /> Mais Fotos
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => openFilePicker(surgery.id)}
                    disabled={uploadingId === surgery.id}
                    style={{
                      width: '100%', padding: '14px', backgroundColor: '#0f4c5c', color: 'white',
                      borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    <Camera size={18} /> {uploadingId === surgery.id ? 'Enviando...' : 'Anexar - [foto do material / comprovante de entrega]'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
        accept="image/*,.pdf,.doc,.docx"
        multiple
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={cameraInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
      />

      {/* File Identify Modal */}
      {pendingAttachment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
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
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Identificar Anexo{pendingAttachment.files.length > 1 ? `s (${pendingAttachment.files.length} arquivos)` : ''} (Obrigatório)
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              {pendingAttachment.files.length > 1 
                ? `Informe o nome base para identificar os ${pendingAttachment.files.length} arquivos selecionados:`
                : 'Informe o nome ou escolha uma opção rápida para identificar este arquivo:'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                'MAT. ESTERIL', 'CAIXA', 'EQUIPAMENTO', 'COMPROVANTE DE ENTREGA'
              ].map(chip => (
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
                    border: '1px solid var(--border-glass)',
                    backgroundColor: attachmentNameInput === chip ? '#2563eb' : 'var(--bg-primary)',
                    color: attachmentNameInput === chip ? 'var(--bg-secondary)' : '#334155',
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
                placeholder="Ex: CAIXA, EQUIPAMENTO, COMPROVANTE..."
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: attachmentNameError ? '1.5px solid #ef4444' : '1px solid var(--border-glass)',
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
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  if (cameraInputRef.current) cameraInputRef.current.value = '';
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
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
                  color: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                }}
              >
                Confirmar e Anexar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Options Modal */}
      {uploadOptionsModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '24px', width: '300px',
            display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', textAlign: 'center', color: 'var(--text-primary)' }}>Adicionar Foto</h3>
            
            <button
              onClick={() => {
                setSelectedSurgeryId(uploadOptionsModal.surgeryId);
                setUploadOptionsModal(null);
                if (cameraInputRef.current) cameraInputRef.current.click();
              }}
              style={{
                padding: '14px', backgroundColor: '#0f4c5c', color: 'white',
                borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Camera size={18} /> Câmera
            </button>
            
            <button
              onClick={() => {
                setSelectedSurgeryId(uploadOptionsModal.surgeryId);
                setUploadOptionsModal(null);
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              style={{
                padding: '14px', backgroundColor: 'var(--bg-glass)', color: '#0f4c5c',
                borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              Galeria
            </button>
            
            <button
              onClick={() => {
                setSelectedSurgeryId(uploadOptionsModal.surgeryId);
                setUploadOptionsModal(null);
                setShowScanner(true);
              }}
              style={{
                padding: '14px', backgroundColor: '#10b981', color: 'white',
                borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <FileText size={18} /> Digitalizar PDF
            </button>
            
            <button
              onClick={() => setUploadOptionsModal(null)}
              style={{
                marginTop: '8px', padding: '10px', backgroundColor: 'transparent', color: 'var(--text-secondary)',
                border: 'none', fontWeight: 'bold', cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (() => {
        const currentItemStr = selectedImage.items[selectedImage.currentIndex];
        const parsed = parsePrintUrl(currentItemStr);
        const hasMultiple = selectedImage.items.length > 1;

        const handleNext = () => {
          setSelectedImage(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.items.length }));
        };

        const handlePrev = () => {
          setSelectedImage(prev => ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length }));
        };

        const handleDownload = async () => {
          try {
            const response = await fetch(parsed.url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = parsed.name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          } catch (error) {
            console.error('Download falhou', error);
            window.open(parsed.url, '_blank');
          }
        };

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <button 
              onClick={() => setSelectedImage(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 99999 }}
            >
              <X size={32} />
            </button>
            
            {isDocumentFile(parsed.url) ? (
              <div style={{ width: '90vw', height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-glass)', borderRadius: '8px', overflow: 'hidden' }}>
                {parsed.url.toLowerCase().includes('.pdf') ? (
                  <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(parsed.url)}&embedded=true`} 
                    style={{ width: '100%', height: '100%', border: 'none' }} 
                    title="PDF Viewer"
                  />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <h3 style={{ margin: 0, color: '#334155', fontSize: '1.2rem' }}>Documento de Texto</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>Visualização direta não suportada.</p>
                    <a href={parsed.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', backgroundColor: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
                      Baixar / Abrir
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={5}
                centerOnInit={true}
              >
                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                  <img 
                    src={parsed.url} 
                    alt="Preview" 
                    style={{ maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} 
                  />
                </TransformComponent>
              </TransformWrapper>
            )}
            
            <div style={{ color: '#fff', marginTop: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
              {parsed.name}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              Foto {selectedImage.currentIndex + 1} de {selectedImage.items.length}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', width: '100%', maxWidth: '300px' }}>
              {hasMultiple && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handlePrev}
                    style={{
                      flex: 1, padding: '12px', backgroundColor: '#334155', color: '#fff',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    Anterior
                  </button>
                  <button
                    onClick={handleNext}
                    style={{
                      flex: 1, padding: '12px', backgroundColor: '#334155', color: '#fff',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    Próxima
                  </button>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleDownload}
                  style={{
                    flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: '#fff', textDecoration: 'none',
                    border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  Baixar
                </button>
                {(!parsed.userName || parsed.userName === user?.username || parsed.userName === user?.name || parsed.userName === user?.email || user?.role === 'Admin' || user?.role === 'Gerente') && (
                  <button
                    onClick={() => handleDeleteImage(selectedImage.surgeryId, currentItemStr)}
                    style={{
                      flex: 1, padding: '12px', backgroundColor: '#ef4444', color: '#fff',
                      border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Customizado de Progresso de Upload */}
      {uploadProgress && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999999
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', borderRadius: '20px', padding: '32px 28px',
            maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: uploadProgress.isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: uploadProgress.isDone ? '#10b981' : '#2563eb', transition: 'all 0.3s'
            }}>
              {uploadProgress.isDone ? <Check size={36} /> : <FileText size={32} />}
            </div>

            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {uploadProgress.isDone ? 'Anexos Enviados!' : 'Enviando Anexos'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {uploadProgress.status}
              </p>
            </div>

            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <span>{uploadProgress.fileName}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: 'var(--border-glass)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${uploadProgress.percent}%`, height: '100%',
                  background: uploadProgress.isDone ? '#10b981' : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                  borderRadius: '999px', transition: 'width 0.3s ease-in-out'
                }} />
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Por favor, aguarde a conclusão do carregamento...
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <DocumentScanner 
          onFinish={handlePdfScanFinish}
          onCancel={() => {
            setShowScanner(false);
            setSelectedSurgeryId(null);
          }}
        />
      )}

    </div>
  );
};

export default DriverPanel;
