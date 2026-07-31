import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Clock, Camera, Plus, Check, X, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

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
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, delivered
  const [uploadingId, setUploadingId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null); // { surgeryId, items: [], currentIndex: number }
  const [uploadOptionsModal, setUploadOptionsModal] = useState(null); // { surgeryId }
  
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
      const [url, ...nameParts] = cleanItem.split('|||');
      return { url, name: nameParts.join('|||') };
    }
    return { url: cleanItem, name: '' };
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
    const file = e.target.files[0];
    if (!file || !selectedSurgeryId) return;

    const fileNameInput = prompt("Digite um nome para este arquivo (Obrigatório):");
    if (!fileNameInput || fileNameInput.trim() === '') {
       alert("Nome do arquivo é obrigatório. Envio cancelado.");
       if (fileInputRef.current) fileInputRef.current.value = '';
       return;
    }

    try {
      setUploadingId(selectedSurgeryId);

      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file, 1200, 1200, 0.7);
      }

      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
      const fileName = `anexo3_${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);

      const valueToStore = `${publicUrl}?anexo=3|||${fileNameInput.trim()}`;
      
      const surgeryToUpdate = surgeries.find(s => s.id === selectedSurgeryId);
      const existingUrls = surgeryToUpdate?.comanda_urls || [];
      const updatedUrls = [...existingUrls, valueToStore];

      const { error: updateError } = await supabase.from('surgeries')
        .update({ 
          comanda_urls: updatedUrls,
          status: 'MATERIAL ENTREGUE',
          delivery_status: '🟢'
        })
        .eq('id', selectedSurgeryId);

      if (updateError) throw updateError;

      // Update local state
      setSurgeries(prev => prev.map(s => {
        if (s.id === selectedSurgeryId) {
          return { ...s, comanda_urls: updatedUrls, status: 'MATERIAL ENTREGUE', delivery_status: '🟢' };
        }
        return s;
      }));

    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro ao enviar comprovante: ' + err.message);
    } finally {
      setUploadingId(null);
      setSelectedSurgeryId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100%', paddingBottom: '80px', fontFamily: "'Inter', sans-serif" }}>
      
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
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Entregas</h1>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>{getDayName()}</p>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
            <Search size={20} color="white" />
          </div>
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
      <div style={{ padding: '20px' }}>
        <input
          type="text"
          placeholder="Buscar paciente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
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
                borderColor: dateFilter === f.id ? '#0f4c5c' : '#cbd5e1',
                backgroundColor: dateFilter === f.id ? '#0f4c5c' : '#ffffff',
                color: dateFilter === f.id ? '#ffffff' : '#475569',
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

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 16px' }}>
          <Calendar size={16} color="#64748b" style={{ marginRight: '8px' }} />
          <input 
            type="date" 
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setDateFilter('custom');
            }}
            style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: '#475569', width: '100%', background: 'transparent' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando entregas...</div>
        ) : filteredSurgeries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Nenhuma entrega encontrada.</div>
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
            const anexo3Items = (surgery.comanda_urls || []).filter(item => {
              return item.includes('?anexo=3') || item.startsWith('[ANEXO_3]|||');
            });

            return (
              <div key={surgery.id} style={{ 
                backgroundColor: '#ffffff', 
                borderRadius: '16px', 
                padding: '20px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                border: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px' }}>PACIENTE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2px' }}>{surgery.patient}</div>
                  </div>
                  <div style={{ 
                    backgroundColor: isDelivered ? '#ecfdf5' : '#fffbeb', 
                    color: isDelivered ? '#10b981' : '#f59e0b',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isDelivered ? <Check size={14} /> : <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f97316' }}></div>}
                    {isDelivered ? 'ENTREGUE' : 'SEPARADO PARA ENTREGAR'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HOSPITAL</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#94a3b8' }}>♡</span> {surgery.hospital}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>MÉDICO</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500' }}>{surgery.doctor}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>DATA</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} color="#64748b" /> {displayDate || '--'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>VENDEDOR</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500' }}>{surgery.salesperson || '--'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HORA</div>
                    <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} color="#64748b" /> {surgery.time || '--'}
                    </div>
                  </div>
                </div>

                {/* Render Attachments */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {isDelivered && anexo3Items.map((itemStr, idx) => {
                    const parsed = parsePrintUrl(itemStr);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleOpenImage(surgery.id, anexo3Items, idx)}
                        style={{ width: '50px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
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
                    );
                  })}
                  
                  {isDelivered && (
                    <button 
                      onClick={() => openFilePicker(surgery.id)}
                      disabled={uploadingId === surgery.id}
                      style={{ 
                        width: '50px', height: '60px', borderRadius: '8px', border: '1px dashed #cbd5e1', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc',
                        cursor: 'pointer', color: '#0f4c5c', minWidth: '50px'
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>

                {isDelivered ? (
                  <button 
                    onClick={() => openFilePicker(surgery.id)}
                    disabled={uploadingId === surgery.id}
                    style={{
                      width: '100%', padding: '12px', backgroundColor: '#f1f5f9', color: '#0f4c5c',
                      borderRadius: '8px', border: 'none', fontWeight: '600', fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    <Camera size={18} /> {uploadingId === surgery.id ? 'Enviando...' : 'Ver / adicionar fotos'}
                  </button>
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
                    <Camera size={18} /> {uploadingId === surgery.id ? 'Enviando...' : 'Anexar - [Material / Comprovante]'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={cameraInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
      />

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
            <h3 style={{ margin: '0 0 16px 0', textAlign: 'center', color: '#0f172a' }}>Adicionar Foto</h3>
            
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
                padding: '14px', backgroundColor: '#f1f5f9', color: '#0f4c5c',
                borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              Galeria
            </button>
            
            <button
              onClick={() => setUploadOptionsModal(null)}
              style={{
                marginTop: '8px', padding: '10px', backgroundColor: 'transparent', color: '#64748b',
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
              <div style={{ width: '90vw', height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
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
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Visualização direta não suportada.</p>
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
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              {hasMultiple && (
                <button
                  onClick={handlePrev}
                  style={{
                    padding: '12px 20px', backgroundColor: '#334155', color: '#fff',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  Anterior
                </button>
              )}
              
              <a 
                href={parsed.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download
                style={{
                  padding: '12px 24px', backgroundColor: '#3b82f6', color: '#fff', textDecoration: 'none',
                  border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Baixar
              </a>

              <button
                onClick={() => handleDeleteImage(selectedImage.surgeryId, currentItemStr)}
                style={{
                  padding: '12px 24px', backgroundColor: '#ef4444', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Excluir
              </button>

              {hasMultiple && (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '12px 20px', backgroundColor: '#334155', color: '#fff',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  Próxima
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DriverPanel;
