import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Plus, Trash2, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { ptBR } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

export default function OnCallModal({ isOpen, onClose, onScheduleUpdated }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [name, setName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      fetchFuncionarios();
    }
  }, [isOpen]);

  const fetchFuncionarios = async () => {
    try {
      const { data, error } = await supabase.from('funcionarios').select('name, color').order('name', { ascending: true });
      if (!error && data) {
        setFuncionarios(data);
      }
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
    }
  };

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('on_call')
        .select('*')
        .order('start_date', { ascending: true });
        
      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Erro ao carregar escala:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateToISO = (dateObj) => {
    if (!dateObj) return '';
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !name) return;
    
    const startStr = formatDateToISO(startDate);
    const endStr = formatDateToISO(endDate);

    const newStart = new Date(startStr + 'T00:00:00');
    const newEnd = new Date(endStr + 'T23:59:59');

    if (newEnd < newStart) {
      alert("A data final não pode ser anterior à data inicial.");
      return;
    }

    const hasOverlap = schedules.some(schedule => {
      const sStart = new Date(schedule.start_date + 'T00:00:00');
      const sEnd = new Date(schedule.end_date + 'T23:59:59');
      // Overlap condition: (Start A <= End B) and (End A >= Start B)
      return newStart <= sEnd && newEnd >= sStart;
    });

    if (hasOverlap) {
      alert("Já existe um pronto aviso cadastrado para esse período (ou parte dele). Exclua a escala conflitante primeiro.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('on_call')
        .insert([{ start_date: startStr, end_date: endStr, name: name.toUpperCase() }]);
        
      if (error) throw error;
      
      // Reset form
      setStartDate(null);
      setEndDate(null);
      setName('');
      
      await fetchSchedules();
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err) {
      console.error('Erro ao adicionar escala:', err);
      alert('Não foi possível adicionar à escala. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta escala?')) return;
    
    try {
      const { error } = await supabase
        .from('on_call')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await fetchSchedules();
      if (onScheduleUpdated) onScheduleUpdated();
    } catch (err) {
      console.error('Erro ao remover escala:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateString;
  };

  const isDateSelectable = (date) => {
    const isRegistered = schedules.some(s => {
      const sStart = new Date(s.start_date + 'T00:00:00');
      const sEnd = new Date(s.end_date + 'T23:59:59');
      return date >= sStart && date <= sEnd;
    });
    return !isRegistered;
  };

  const renderDayContents = (day, date) => {
    const schedule = schedules.find(s => {
      const sStart = new Date(s.start_date + 'T00:00:00');
      const sEnd = new Date(s.end_date + 'T23:59:59');
      return date >= sStart && date <= sEnd;
    });

    let bgColor = 'transparent';
    let textColor = 'inherit';
    
    if (schedule) {
      const func = funcionarios.find(f => f.name.toUpperCase() === schedule.name.toUpperCase());
      bgColor = func?.color || '#ef4444'; // Default red if no color found
      textColor = '#fff';
    }

    return (
      <div style={{
        backgroundColor: bgColor,
        color: textColor,
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        margin: 'auto',
        opacity: schedule ? 1 : 1,
        fontWeight: schedule ? 'bold' : 'normal',
        fontSize: '0.9rem'
      }}>
        {day}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        .react-datepicker-wrapper { width: 100%; }
        .react-datepicker__input-container input { width: 100%; }
        .react-datepicker { background-color: var(--text-primary) !important; border: 1px solid rgba(255,255,255,0.1) !important; font-family: inherit; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border-radius: 8px !important; }
        .react-datepicker__header { background-color: var(--text-primary) !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; border-top-left-radius: 8px !important; border-top-right-radius: 8px !important; padding-top: 10px; }
        .react-datepicker__current-month, .react-datepicker-time__header, .react-datepicker-year-header, .react-datepicker__day-name { color: var(--bg-primary) !important; }
        .react-datepicker__day { color: var(--bg-primary); margin: 0.15rem; border-radius: 50% !important; }
        .react-datepicker__day:hover { background-color: rgba(255,255,255,0.1); }
        .react-datepicker__day--selected { background-color: var(--accent-blue) !important; color: white !important; }
        .react-datepicker__day--keyboard-selected { background-color: transparent !important; }
        .react-datepicker__day--disabled { color: rgba(255,255,255,0.3) !important; cursor: not-allowed; }
        .react-datepicker-popper { z-index: 9999 !important; }
      `}</style>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={24} style={{ color: '#3b82f6' }} />
            Gerenciar Pronto Aviso
          </h2>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Coluna Esquerda: Escala Cadastrada */}
          <div style={{ flex: 1.5, minWidth: '350px' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Escala Cadastrada</h3>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando...</div>
            ) : schedules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                Nenhuma escala cadastrada.
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflowY: 'auto', maxHeight: '350px' }}>
                {schedules.map((item, index) => {
                  const func = funcionarios.find(f => f.name.toUpperCase() === item.name.toUpperCase());
                  const dotColor = func?.color || '#3b82f6';
                  
                  return (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: index < schedules.length - 1 ? '1px solid var(--border-glass)' : 'none'
                    }}>
                      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'center' }}>
                        <div style={{ fontWeight: '500', width: '120px' }}>
                          {formatDate(item.start_date)} - {formatDate(item.end_date)}
                        </div>
                        <div style={{ color: dotColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor }}></div>
                          {item.name}
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn-icon" 
                        style={{ color: '#ef4444' }}
                        onClick={() => handleDelete(item.id)}
                        title="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Formulário */}
          <div style={{ flex: 1, minWidth: '280px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '1rem', color: 'var(--text-secondary)' }}>Adicionar Novo</h3>
            <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label className="form-label">Data Início</label>
                <DatePicker 
                  selected={startDate} 
                  onChange={(date) => setStartDate(date)} 
                  className="form-input" 
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  placeholderText="Selecione a data inicial"
                  filterDate={isDateSelectable}
                  renderDayContents={renderDayContents}
                  required
                />
              </div>
              <div>
                <label className="form-label">Data Fim</label>
                <DatePicker 
                  selected={endDate} 
                  onChange={(date) => setEndDate(date)} 
                  className="form-input" 
                  dateFormat="dd/MM/yyyy"
                  locale={ptBR}
                  placeholderText="Selecione a data final"
                  filterDate={isDateSelectable}
                  renderDayContents={renderDayContents}
                  minDate={startDate}
                  required
                />
              </div>
              <div>
                <label className="form-label">Nome (Funcionário)</label>
                <select 
                  className="form-input" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required
                >
                  <option value="">Selecione...</option>
                  {funcionarios.map((f, idx) => (
                    <option key={idx} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                disabled={isSubmitting}
              >
                <Plus size={18} />
                Adicionar Escala
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
