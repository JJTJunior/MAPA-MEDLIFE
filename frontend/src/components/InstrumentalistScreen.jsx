import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Calendar as CalendarIcon, FileText, Camera, X, Plus } from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

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

export default function InstrumentalistScreen({ user }) {
  const [loading, setLoading] = useState(true);
  const [surgeries, setSurgeries] = useState([]);
  const [filteredSurgeries, setFilteredSurgeries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros: 'hoje', 'ontem', '7dias', 'todos'
  const [activeDateFilter, setActiveDateFilter] = useState('hoje');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // all, pending, delivered
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);
  const [selectedSurgeryId, setSelectedSurgeryId] = useState(null);
  const [uploadOptionsModal, setUploadOptionsModal] = useState(null); // { surgeryId }
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [stats, setStats] = useState({
    pacientes: 0,
    pendentes: 0,
    entregues: 0
  });

  useEffect(() => {
    if (user?.name) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('surgeries')
        .select('*')
        .in('status', ['Material entregue', 'MATERIAL ENTREGUE'])
        .order('date', { ascending: false });

      if (user?.role === 'Instrumentador') {
        query = query.or(`instrumentalist1.eq."${user.name}",instrumentalist2.eq."${user.name}"`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setSurgeries(data || []);
      applyFilters(data || [], activeDateFilter, searchTerm, customDate);
    } catch (err) {
      console.error('Erro ao buscar dados do instrumentador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters(surgeries, activeDateFilter, searchTerm, customDate);
  }, [activeDateFilter, searchTerm, customDate, surgeries]);

  const applyFilters = (data, dateFilter, search, cDate) => {
    let filtered = [...data];

    // Busca textual
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.patient && item.patient.toLowerCase().includes(s)) ||
        (item.doctor && item.doctor.toLowerCase().includes(s)) ||
        (item.hospital && item.hospital.toLowerCase().includes(s))
      );
    }

    // Filtro de Datas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const getFormatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (cDate) {
      filtered = filtered.filter(item => item.date === cDate);
      setActiveDateFilter(''); // Desmarca os chips rápidos se usar data customizada
    } else {
      if (dateFilter === 'hoje') {
        const strHoje = getFormatDate(today);
        filtered = filtered.filter(item => item.date === strHoje);
      } else if (dateFilter === 'ontem') {
        const ontem = new Date(today);
        ontem.setDate(today.getDate() - 1);
        const strOntem = getFormatDate(ontem);
        filtered = filtered.filter(item => item.date === strOntem);
      } else if (dateFilter === '7dias') {
        const seteDias = new Date(today);
        seteDias.setDate(today.getDate() - 7);
        const strSeteDias = getFormatDate(seteDias);
        const strHoje = getFormatDate(today);
        filtered = filtered.filter(item => item.date >= strSeteDias && item.date <= strHoje);
      }
    }

    setFilteredSurgeries(filtered);

    // Atualizar stats
    const patientsCount = filtered.length; // Cada cirurgia conta como paciente
    
    let entreguesCount = 0;
    let pendentesCount = 0;
    
    filtered.forEach(item => {
      const anexo2Items = item.comanda_urls && Array.isArray(item.comanda_urls) 
        ? item.comanda_urls.filter(url => !url.includes('anexo=3') && !url.includes('[ANEXO_3]')) 
        : [];
      
      if (anexo2Items.length > 0) {
        entreguesCount++;
      } else {
        pendentesCount++;
      }
    });

    setStats({
      pacientes: patientsCount,
      pendentes: pendentesCount,
      entregues: entreguesCount
    });
  };

  const handleDateFilterClick = (filter) => {
    setActiveDateFilter(filter);
    setCustomDate(''); // Limpa a data customizada ao clicar num botão rápido
  };

  const getFormatDisplayDate = () => {
    const d = new Date();
    const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
    let dataStr = d.toLocaleDateString('pt-BR', opcoes);
    // Capitaliza primeira letra
    return dataStr.charAt(0).toUpperCase() + dataStr.slice(1);
  };

  // Funções para Anexo 2
  const getAnexo2Items = (item) => {
    if (item.comanda_urls && Array.isArray(item.comanda_urls)) {
      return item.comanda_urls.filter(url => !url.includes('anexo=3') && !url.includes('[ANEXO_3]'));
    }
    return [];
  };

  const getAnexo3Items = (item) => {
    if (item.comanda_urls && Array.isArray(item.comanda_urls)) {
      return item.comanda_urls.filter(url => url.includes('anexo=3') || url.includes('[ANEXO_3]'));
    }
    return [];
  };

  const getAnexo2Url = (item) => {
    const items = getAnexo2Items(item);
    if (items.length > 0) return items[items.length - 1];
    return null;
  };

  const parsePrintUrl = (fullString) => {
    if (!fullString) return { url: '', name: 'Anexo', userName: null };
    const parts = fullString.split('|||');
    let userName = null;
    if (parts.length > 2 && parts[2].startsWith('UPLOADED_BY:')) {
      userName = parts[2].replace('UPLOADED_BY:', '');
    }
    return {
      url: parts[0] || '',
      name: parts[1] || 'Anexo',
      userName: userName
    };
  };

  const isDocumentFile = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.pdf') || lower.includes('.doc') || lower.includes('.docx');
  };

  const handleDeleteImage = async (surgeryId, fullString) => {
    if (!window.confirm('Tem certeza que deseja excluir este anexo?')) return;
    
    try {
      const surgeryToUpdate = surgeries.find(s => s.id === surgeryId);
      if (!surgeryToUpdate) return;
      
      const updatedUrls = (surgeryToUpdate.comanda_urls || []).filter(item => item !== fullString);
      
      const { error } = await supabase.from('surgeries')
        .update({ comanda_urls: updatedUrls })
        .eq('id', surgeryId);
        
      if (error) throw error;
      
      setSurgeries(prev => prev.map(s => {
        if (s.id === surgeryId) {
          return { ...s, comanda_urls: updatedUrls };
        }
        return s;
      }));
      setSelectedImage(null); // Close modal on delete
    } catch (err) {
      console.error('Erro ao excluir anexo:', err);
      alert('Erro ao excluir anexo: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedSurgeryId) return;

    const fileNameInput = prompt("Digite um nome para este arquivo (Obrigatório):");
    if (!fileNameInput || fileNameInput.trim() === '') {
       alert("Nome do arquivo é obrigatório. Envio cancelado.");
       if (fileInputRef.current) fileInputRef.current.value = '';
       if (cameraInputRef.current) cameraInputRef.current.value = '';
       return;
    }

    try {
      setUploadingId(selectedSurgeryId);
      setUploadProgress({
        current: 0,
        total: files.length,
        fileName: fileNameInput.trim(),
        percent: 5,
        status: `Preparando ${files.length} arquivo(s)...`,
        isDone: false
      });

      const uploaderName = user?.name || user?.email || 'Desconhecido';
      const surgeryToUpdate = surgeries.find(s => s.id === selectedSurgeryId);
      const existingUrls = surgeryToUpdate?.comanda_urls || [];
      const newValuesToStore = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const displayName = files.length > 1 ? `${fileNameInput.trim()} (${i + 1})` : fileNameInput.trim();
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
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file, 1200, 1200, 0.7);
        }

        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'png';
        const fileName = `anexo2_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        const valueToStore = `${publicUrl}?anexo=2|||${displayName}|||UPLOADED_BY:${uploaderName}`;
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
          comanda_urls: updatedUrls,
        })
        .eq('id', selectedSurgeryId);

      if (updateError) throw updateError;

      // Update local state
      setSurgeries(prev => prev.map(s => {
        if (s.id === selectedSurgeryId) {
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

  const openFilePicker = (id) => {
    setUploadOptionsModal({ surgeryId: id });
  };

  return (
    <div className="mobile-edge-to-edge" style={{ backgroundColor: '#f3f4f6', minHeight: '100%', paddingBottom: '80px' }}>
      
      {/* HEADER CARD */}
      <div style={{ 
        backgroundColor: '#1e40af', // Azul da logo
        borderBottomLeftRadius: '20px',
        borderBottomRightRadius: '20px',
        padding: '24px 20px',
        color: '#fff',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        position: 'relative'
      }}>
        
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              Entrega de Comanda / Documentação
            </h1>
            <p style={{ color: '#ccfbf1', fontSize: '0.9rem', marginTop: '4px' }}>
              {getFormatDisplayDate()}
            </p>
          </div>
          
          <button style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff'
          }}>
            <Search size={20} />
          </button>
        </div>

        {/* METRICS ROW */}
        <div style={{ display: 'flex', gap: '12px' }}>
          
          {/* Card: Pacientes */}
          <div 
            onClick={() => setStatusFilter('all')}
            style={{ 
              flex: 1,
              backgroundColor: statusFilter === 'all' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              padding: '12px', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: statusFilter === 'all' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{stats.pacientes}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', color: '#ccfbf1', marginTop: '6px' }}>PACIENTES</span>
          </div>

          {/* Card: Pendentes */}
          <div 
            onClick={() => setStatusFilter('pending')}
            style={{ 
              flex: 1,
              backgroundColor: statusFilter === 'pending' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              padding: '12px', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: statusFilter === 'pending' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{stats.pendentes}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', color: '#ccfbf1', marginTop: '6px' }}>PENDENTES</span>
          </div>

          {/* Card: Entregues */}
          <div 
            onClick={() => setStatusFilter('delivered')}
            style={{ 
              flex: 1,
              backgroundColor: statusFilter === 'delivered' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', 
              borderRadius: '12px', 
              padding: '12px', 
              display: 'flex', 
              flexDirection: 'column',
              cursor: 'pointer',
              border: statusFilter === 'delivered' ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}>{stats.entregues}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: '600', letterSpacing: '0.5px', color: '#ccfbf1', marginTop: '6px' }}>ENTREGUES</span>
          </div>

        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 4px 10px 4px' }}>
        
        {/* Search Input */}
        <input 
          type="text"
          placeholder="Buscar paciente"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            fontSize: '1rem',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        />

        {/* Chips */}
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: 'ontem', label: 'Ontem' },
            { id: '7dias', label: 'Últimos 7 dias' },
            { id: 'todos', label: 'Todos' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => handleDateFilterClick(btn.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: activeDateFilter === btn.id ? 'none' : '1px solid #e5e7eb',
                backgroundColor: activeDateFilter === btn.id ? '#1e40af' : '#fff',
                color: activeDateFilter === btn.id ? '#fff' : '#374151',
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: activeDateFilter === btn.id ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date Picker Customizado */}
        <div style={{ position: 'relative' }}>
          <CalendarIcon size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
          <input 
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              paddingRight: '40px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#fff',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              color: '#374151',
              // Esconder o ícone nativo em alguns browsers via css seria ideal, mas usaremos aparência padronizada aqui
            }}
          />
        </div>
      </div>

      {/* LISTAGEM */}
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
            Carregando dados...
          </div>
        ) : filteredSurgeries.filter(s => {
          const anexo2Items = s.comanda_urls && Array.isArray(s.comanda_urls) 
            ? s.comanda_urls.filter(url => !url.includes('anexo=3') && !url.includes('[ANEXO_3]')) 
            : [];
          const isPending = anexo2Items.length === 0;
          const isDelivered = anexo2Items.length > 0;
          if (statusFilter === 'pending') return isPending;
          if (statusFilter === 'delivered') return isDelivered;
          return true; // all
        }).length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px', backgroundColor: 'transparent' }}>
            Nenhuma entrega encontrada.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 4px' }}>
            {filteredSurgeries.filter(s => {
              const anexo2Items = s.comanda_urls && Array.isArray(s.comanda_urls) 
                ? s.comanda_urls.filter(url => !url.includes('anexo=3') && !url.includes('[ANEXO_3]')) 
                : [];
              const isPending = anexo2Items.length === 0;
              const isDelivered = anexo2Items.length > 0;
              if (statusFilter === 'pending') return isPending;
              if (statusFilter === 'delivered') return isDelivered;
              return true; // all
            }).map((surgery, idx) => {
              const urlAnexo2 = getAnexo2Url(surgery);
              const isDelivered = surgery.status && surgery.status.toUpperCase() === 'MATERIAL ENTREGUE';

              // format date
              let displayDate = surgery.date;
              if (displayDate) {
                const d = new Date(displayDate + 'T00:00:00');
                const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
                displayDate = `${d.getDate()} ${months[d.getMonth()]}`;
              }
              
              return (
                <div key={idx} style={{
                  backgroundColor: '#ffffff', 
                  borderRadius: '16px', 
                  padding: '20px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px' }}>PACIENTE</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginTop: '2px', textTransform: 'uppercase' }}>{surgery.patient || 'PACIENTE NÃO INFORMADO'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HOSPITAL</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#94a3b8' }}>♡</span> {surgery.hospital || '--'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>MÉDICO</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500' }}>{surgery.doctor || '--'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>DATA</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarIcon size={14} color="#64748b" /> {displayDate || '--'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>VENDEDOR</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500' }}>{surgery.salesperson || '--'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '4px' }}>HORA</div>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#64748b', fontSize: '14px' }}>⏱</span> {surgery.time || '--'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginBottom: '16px' }}>
                    <span 
                      className={`status-badge ${isDelivered ? 'status-delivered' : 'status-ready'}`} 
                      style={{ padding: '6px 12px', whiteSpace: 'normal', textAlign: 'left' }}
                    >
                      {isDelivered ? '🟢 MATERIAL ENTREGUE' : (surgery.status ? `🟠 ${surgery.status.toUpperCase()}` : '⚪ SEM STATUS')}
                    </span>
                    {(() => {
                      const anexo2Items = getAnexo2Items(surgery);
                      if (anexo2Items.length > 0) {
                        const parsedLast = parsePrintUrl(anexo2Items[anexo2Items.length - 1]);
                        const deliveredBy = parsedLast.userName;
                        if (deliveredBy) {
                          return (
                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600', marginLeft: '4px' }}>
                              por {deliveredBy}
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>

                  {/* Render Driver Attachments (anexo3Items) */}
                  {(() => {
                    const anexo3Items = getAnexo3Items(surgery);
                    if (anexo3Items.length > 0) {
                      return (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '8px' }}>FOTOS DA ENTREGA (MOTORISTA)</div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {anexo3Items.map((itemStr, idx) => {
                              const parsed = parsePrintUrl(itemStr);
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                                  <div 
                                    onClick={() => setSelectedImage({ items: anexo3Items, currentIndex: idx, surgeryId: surgery.id })}
                                    style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}
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
                                  <div style={{ fontSize: '0.55rem', color: '#64748b', textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }} title={parsed.name || `Anexo ${idx + 1}`}>
                                    {parsed.name || `Anexo ${idx + 1}`}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Render Attachments (Instrumentalist - Comanda/Documentação) */}
                  {(() => {
                    const anexo2Items = getAnexo2Items(surgery);
                    if (anexo2Items.length > 0) {
                      return (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.5px', marginBottom: '8px' }}>COMANDA / DOCUMENTAÇÃO</div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {anexo2Items.map((itemStr, idx) => {
                            const parsed = parsePrintUrl(itemStr);
                            return (
                              <div 
                                key={idx} 
                                onClick={() => setSelectedImage({ items: anexo2Items, currentIndex: idx, surgeryId: surgery.id })}
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
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const anexo2Items = getAnexo2Items(surgery);
                    if (anexo2Items.length > 0) {
                      return (
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
                      );
                    }
                    return (
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
                        <Camera size={18} /> {uploadingId === surgery.id ? 'Enviando...' : 'Anexar - [Comanda / Documentação]'}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden file inputs for uploading Anexo 2 */}
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
            backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px 28px',
            maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: uploadProgress.isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: uploadProgress.isDone ? '#10b981' : '#2563eb', transition: 'all 0.3s'
            }}>
              {uploadProgress.isDone ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <FileText size={32} />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                <span>{uploadProgress.fileName}</span>
                <span>{uploadProgress.percent}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
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
    </div>
  );
}
