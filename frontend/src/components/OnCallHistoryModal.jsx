import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, History } from 'lucide-react';

export default function OnCallHistoryModal({ isOpen, onClose }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchSchedules();
      fetchFuncionarios();
    }
  }, [isOpen]);

  const fetchFuncionarios = async () => {
    try {
      const { data, error } = await supabase.from('funcionarios').select('name, color');
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
        .order('start_date', { ascending: false });
        
      if (error) throw error;
      setSchedules(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
  };

  if (!isOpen) return null;

  const groupedSchedules = {};
  schedules.forEach(item => {
    const d = new Date(item.start_date + 'T00:00:00');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    
    if (!groupedSchedules[monthKey]) {
      groupedSchedules[monthKey] = [];
    }
    groupedSchedules[monthKey].push(item);
  });

  const groupEntries = Object.entries(groupedSchedules);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={24} style={{ color: '#3b82f6' }} />
            Histórico de Pronto Aviso
          </h2>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Carregando...</div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              Nenhum histórico encontrado.
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflowY: 'auto', maxHeight: '400px' }}>
              {groupEntries.map(([month, items], groupIndex) => (
                <div key={month} style={{ borderBottom: groupIndex < groupEntries.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '8px 16px', fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem', position: 'sticky', top: 0, zIndex: 1, borderBottom: '1px solid var(--border-glass)' }}>
                    {month}
                  </div>
                  {items.map((item, index) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const end = new Date(item.end_date + 'T23:59:59');
                const isPast = today > end;
                const func = funcionarios.find(f => f.name.toUpperCase() === item.name.toUpperCase());
                const dotColor = func?.color || '#3b82f6';
                
                return (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: index < schedules.length - 1 ? '1px solid var(--border-glass)' : 'none',
                    opacity: isPast ? 0.6 : 1
                  }}>
                    <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'center' }}>
                      <div style={{ fontWeight: '500', width: '200px' }}>
                        {formatDate(item.start_date)} - {formatDate(item.end_date)}
                      </div>
                      <div style={{ color: dotColor, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dotColor }}></div>
                        {item.name}
                      </div>
                    </div>
                    {isPast && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                        Concluído
                      </span>
                    )}
                  </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
