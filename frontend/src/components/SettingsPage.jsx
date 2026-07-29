import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { X, Settings, Users, Stethoscope, Building2, UserPlus, Tag, Plus, Trash2, ShieldAlert, Activity, FileText, Hash, List, Edit2, Save, Search, ArrowLeft } from 'lucide-react';
import UserManagement from './UserManagement';
import AuditLogs from './AuditLogs';

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b'];

export default function SettingsPage({ user, onBack }) {
  const availableTabs = useMemo(() => {
    return [
      { id: 'vendedores', icon: <Users size={18} />, label: 'Vendedores' },
      { id: 'medicos', icon: <Stethoscope size={18} />, label: 'Médicos' },
      { id: 'instrumentadores', icon: <UserPlus size={18} />, label: 'Instrumentadores' },
      { id: 'hospitais', icon: <Building2 size={18} />, label: 'Hospitais' },
      { id: 'convenios', icon: <FileText size={18} />, label: 'Convênios' },
      { id: 'surgery_types', icon: <Activity size={18} />, label: 'Tipos Cirurgia' },
      { id: 'carater', icon: <Tag size={18} />, label: 'Caráter' },
      { id: 'status', icon: <Tag size={18} />, label: 'Status' },
      { id: 'funcionarios', icon: <Users size={18} />, label: 'Funcionários' },
      { id: 'user_groups', icon: <ShieldAlert size={18} />, label: 'Grupos (Acesso)' },
      { id: 'usuarios', icon: <ShieldAlert size={18} />, label: 'Usuários (Acesso)' },
      { id: 'logs', icon: <List size={18} />, label: 'Logs de Auditoria' }
    ].filter(tab => {
      if (user?.role === 'Admin' || user?.role === 'Gerente' || user?.role === 'TI' || user?.role === 'Administrativo' || user?.role === 'Diretoria') return true;
      return user?.permissions?.allowed_edit_fields?.includes(`cad_${tab.id}`);
    });
  }, [user]);

  const [activeTab, setActiveTab] = useState(() => {
    return availableTabs.length > 0 ? availableTabs[0].id : 'vendedores';
  }); 
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCrm, setNewItemCrm] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⚪');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCrm, setEditCrm] = useState('');
  const [editIcon, setEditIcon] = useState('⚪');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
    setSearchTerm('');
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    setItems([]); // Clear previous items
    try {
      const table = activeTab;
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('name', { ascending: true });
        
      if (error && activeTab === 'carater') {
        const stored = localStorage.getItem('carater_list');
        const defaultCarater = [
          { id: '1', name: 'ELETIVA' },
          { id: '2', name: 'URGÊNCIA' },
          { id: '3', name: 'JUDICIAL' }
        ];
        setItems(stored ? JSON.parse(stored) : defaultCarater);
        setLoading(false);
        return;
      }
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(`Erro ao carregar ${activeTab}:`, err);
      if (activeTab === 'carater') {
        const stored = localStorage.getItem('carater_list');
        const defaultCarater = [
          { id: '1', name: 'ELETIVA' },
          { id: '2', name: 'URGÊNCIA' },
          { id: '3', name: 'JUDICIAL' }
        ];
        setItems(stored ? JSON.parse(stored) : defaultCarater);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    
    let baseName = newItemName.trim().toUpperCase();
    
    const isDuplicate = items.some(item => {
      const rawName = item.name || '';
      if (activeTab === 'status' && rawName.includes('|')) {
        return rawName.split('|')[1].toUpperCase() === baseName;
      }
      if (activeTab === 'medicos' && rawName.includes('|CRM:')) {
        return rawName.split('|CRM:')[0].toUpperCase() === baseName;
      }
      return rawName.toUpperCase() === baseName;
    });

    if (isDuplicate) {
      setErrorMsg('Já existe um cadastro com esse nome.');
      return;
    }

    if (activeTab === 'medicos' && newItemCrm.trim()) {
      const crmToValidate = newItemCrm.trim();
      const isCrmDuplicate = items.some(item => {
        const rawName = item.name || '';
        if (rawName.includes('|CRM:')) {
          return rawName.split('|CRM:')[1] === crmToValidate;
        }
        return false;
      });

      if (isCrmDuplicate) {
        setErrorMsg('Este CRM já está cadastrado para outro médico.');
        return;
      }
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const table = activeTab;
      
      let finalName = baseName;
      if (activeTab === 'status') {
        finalName = `${selectedIcon}|${finalName}`;
      }

      let insertData = { name: finalName };
      if (activeTab === 'funcionarios') {
        insertData.color = selectedColor;
      } else if (activeTab === 'medicos' && newItemCrm.trim()) {
        insertData.name = `${finalName}|CRM:${newItemCrm.trim()}`;
      }

      if (activeTab === 'carater') {
        const updated = [...items, { id: String(Date.now()), name: finalName }];
        localStorage.setItem('carater_list', JSON.stringify(updated));
        supabase.from('carater').insert([insertData]).then(() => {}).catch(() => {});
        setNewItemName('');
        setItems(updated);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from(table)
        .insert([insertData]);
        
      if (error) throw error;
      
      setNewItemName('');
      setNewItemCrm('');
      await fetchItems();
    } catch (err) {
      console.error(`Erro ao adicionar em ${activeTab}:`, err);
      setErrorMsg('Não foi possível adicionar. Verifique o console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    // Confirmation is now handled by inline buttons
    
    if (activeTab === 'carater') {
      const updated = items.filter(item => item.id !== id);
      localStorage.setItem('carater_list', JSON.stringify(updated));
      supabase.from('carater').delete().eq('id', id).then(() => {}).catch(() => {});
      setItems(updated);
      return;
    }

    try {
      const table = activeTab;
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
        
      if (error) {
        if (error.code === '23503') {
          throw new Error('Este item já está vinculado a alguma cirurgia e não pode ser excluído.');
        }
        throw error;
      }
      
      await fetchItems();
    } catch (err) {
      console.error(`Erro ao remover de ${activeTab}:`, err);
      setErrorMsg(`Erro: ${err.message || 'Desconhecido'} (Código: ${err.code || 'N/A'}). Se o problema persistir, atualize a página e tente novamente.`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    const rawName = item.name || '';
    if (activeTab === 'status' && rawName.includes('|')) {
      const parts = rawName.split('|');
      setEditIcon(parts[0]);
      setEditValue(parts[1]);
    } else if (activeTab === 'medicos' && rawName.includes('|CRM:')) {
      const parts = rawName.split('|CRM:');
      setEditValue(parts[0]);
      setEditCrm(parts[1]);
      setEditIcon('⚪');
    } else {
      setEditValue(rawName);
      setEditIcon('⚪');
      if (activeTab === 'funcionarios') setEditColor(item.color || '#3b82f6');
      if (activeTab === 'medicos') setEditCrm('');
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editValue.trim()) return;

    let baseName = editValue.trim().toUpperCase();

    const isDuplicateName = items.some(item => {
      if (item.id === id) return false;
      const rawName = item.name || '';
      if (activeTab === 'status' && rawName.includes('|')) return rawName.split('|')[1].toUpperCase() === baseName;
      if (activeTab === 'medicos' && rawName.includes('|CRM:')) return rawName.split('|CRM:')[0].toUpperCase() === baseName;
      return rawName.toUpperCase() === baseName;
    });

    if (isDuplicateName) {
      setErrorMsg('Já existe outro cadastro com esse nome.');
      return;
    }

    if (activeTab === 'medicos' && editCrm.trim()) {
      const crmToValidate = editCrm.trim();
      const isCrmDuplicate = items.some(item => {
        if (item.id === id) return false;
        const rawName = item.name || '';
        if (rawName.includes('|CRM:')) {
          return rawName.split('|CRM:')[1] === crmToValidate;
        }
        return false;
      });

      if (isCrmDuplicate) {
        setErrorMsg('Este CRM já está cadastrado para outro médico.');
        return;
      }
    }

    setErrorMsg('');

    try {
      let finalName = baseName;
      if (activeTab === 'status') {
        finalName = `${editIcon}|${finalName}`;
      }
      let updateData = { name: finalName };
      if (activeTab === 'funcionarios') {
        updateData.color = editColor;
      }
      if (activeTab === 'medicos' && editCrm.trim()) {
        updateData.name = `${finalName}|CRM:${editCrm.trim()}`;
      }

      if (activeTab === 'carater') {
        const updated = items.map(item => item.id === id ? { ...item, name: finalName } : item);
        localStorage.setItem('carater_list', JSON.stringify(updated));
        supabase.from('carater').update(updateData).eq('id', id).then(() => {}).catch(() => {});
        setEditingId(null);
        setItems(updated);
        return;
      }

      const { error } = await supabase
        .from(activeTab)
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      setEditingId(null);
      await fetchItems();
    } catch (err) {
      console.error(`Erro ao editar em ${activeTab}:`, err);
      setErrorMsg('Não foi possível editar.');
    }
  };

  const filteredItems = items.filter(item => {
    const rawItemName = item.name || '';
    let itemName = rawItemName;
    if (activeTab === 'status' && rawItemName.includes('|')) itemName = rawItemName.split('|')[1];
    else if (activeTab === 'medicos' && rawItemName.includes('|CRM:')) itemName = rawItemName.split('|CRM:')[0];
    return itemName.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((a, b) => {
    let nameA = (a.name || '').includes('|') ? (a.name.split('|')[1] || a.name) : (a.name || '');
    if (activeTab === 'medicos' && (a.name || '').includes('|CRM:')) nameA = a.name.split('|CRM:')[0];
    let nameB = (b.name || '').includes('|') ? (b.name.split('|')[1] || b.name) : (b.name || '');
    if (activeTab === 'medicos' && (b.name || '').includes('|CRM:')) nameB = b.name.split('|CRM:')[0];
    return nameA.localeCompare(nameB);
  });

  

  return (
    <div className="settings-page">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={28} style={{ color: '#3b82f6' }} />
            Configurações do Sistema
          </h2>
          <p className="dashboard-subtitle">Gerencie os parâmetros, acessos e configurações do Medlife</p>
        </div>
        {onBack && (
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        )}
      </div>

      <div className="settings-layout">
        {/* Sidebar Menu */}
        <div className="settings-sidebar glass-card">
          <div className="settings-menu">
            {availableTabs.map(tab => (
              <button 
                key={tab.id}
                type="button"
                className={`settings-menu-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg('');
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="settings-content glass-card">
          {activeTab !== 'usuarios' && activeTab !== 'logs' && (
            <>
              <div style={{ marginBottom: '25px' }}>
              <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
                {activeTab === 'status' && (
                  <select
                    className="form-input"
                    value={selectedIcon}
                    onChange={e => setSelectedIcon(e.target.value)}
                    style={{ width: '80px', padding: '0 10px', fontSize: '1.2rem' }}>
                    <option value="⚪">⚪</option>
                    <option value="🟢">🟢</option>
                    <option value="🟡">🟡</option>
                    <option value="🟠">🟠</option>
                    <option value="🔴">🔴</option>
                    <option value="🔵">🔵</option>
                    <option value="🟣">🟣</option>
                    <option value="⚫">⚫</option>
                    <option value="🟤">🟤</option>
                    <option value="🟩">🟩</option>
                    <option value="🟨">🟨</option>
                    <option value="🟧">🟧</option>
                    <option value="🟥">🟥</option>
                    <option value="🟦">🟦</option>
                    <option value="🟪">🟪</option>
                    <option value="⬛">⬛</option>
                    <option value="⬜">⬜</option>
                    <option value="🟫">🟫</option>
                    <option value="✅">✅</option>
                    <option value="❌">❌</option>
                    <option value="⚠️">⚠️</option>
                    <option value="⏳">⏳</option>
                    <option value="🛑">🛑</option>
                    <option value="🔄">🔄</option>
                    <option value="📌">📌</option>
                    <option value="📍">📍</option>
                  </select>
                )}
                {activeTab === 'funcionarios' && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '0 5px' }}>
                    {PRESET_COLORS.map(color => (
                      <div
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        style={{
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '50%', 
                          backgroundColor: color,
                          cursor: 'pointer', 
                          border: selectedColor === color ? '2px solid white' : '2px solid transparent',
                          boxShadow: selectedColor === color ? `0 0 0 1px ${color}` : 'none',
                          transition: 'all 0.2s'
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                )}
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={`Novo nome de ${activeTab === 'status' ? 'status' : activeTab === 'surgery_types' ? 'tipo de cirurgia' : activeTab.slice(0, -1)}...`}
                  value={newItemName} 
                  onChange={e => setNewItemName(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                {activeTab === 'medicos' && (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="CRM..."
                    value={newItemCrm}
                    onChange={e => setNewItemCrm(e.target.value)}
                    style={{ width: '120px' }}
                  />
                )}
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Plus size={18} />
                    Adicionar
                  </button>
                </form>
              </div>
              
              {errorMsg && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '500' }}>{errorMsg}</span>
                  <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'usuarios' ? (
            <UserManagement currentUser={user} />
          ) : activeTab === 'logs' ? (
            <AuditLogs />
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', textTransform: 'capitalize', margin: 0, fontWeight: '600' }}>
                  Lista de {activeTab === 'surgery_types' ? 'Tipos de Cirurgia' : activeTab}
                </h3>
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '100%' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando...</div>
                ) : filteredItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado.
                  </div>
                ) : (
                  filteredItems.map((item, index) => {
                    const rawItemName = item.name || '';
                    const itemName = activeTab === 'status' && rawItemName.includes('|') 
                      ? rawItemName.split('|')[1] 
                      : (activeTab === 'medicos' && rawItemName.includes('|CRM:') ? rawItemName.split('|CRM:')[0] : rawItemName);
                    const itemCrm = activeTab === 'medicos' && rawItemName.includes('|CRM:') ? rawItemName.split('|CRM:')[1] : null;

                    return (
                    <div key={item.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderBottom: index < filteredItems.length - 1 ? '1px solid var(--border-glass)' : 'none',
                      transition: 'background 0.2s',
                      backgroundColor: 'transparent'
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '10px' }}>
                          {activeTab === 'status' && (
                            <select
                              className="form-input"
                              value={editIcon}
                              onChange={e => setEditIcon(e.target.value)}
                              style={{ width: '60px', padding: '0 5px', fontSize: '1rem', height: '36px' }}>
                              <option value="⚪">⚪</option>
                              <option value="🟢">🟢</option>
                              <option value="🟡">🟡</option>
                              <option value="🟠">🟠</option>
                              <option value="🔴">🔴</option>
                              <option value="🔵">🔵</option>
                              <option value="🟣">🟣</option>
                              <option value="⚫">⚫</option>
                              <option value="🟤">🟤</option>
                              <option value="🟩">🟩</option>
                              <option value="🟨">🟨</option>
                              <option value="🟧">🟧</option>
                              <option value="🟥">🟥</option>
                              <option value="🟦">🟦</option>
                              <option value="🟪">🟪</option>
                              <option value="⬛">⬛</option>
                              <option value="⬜">⬜</option>
                              <option value="🟫">🟫</option>
                              <option value="✅">✅</option>
                              <option value="❌">❌</option>
                              <option value="⚠️">⚠️</option>
                              <option value="⏳">⏳</option>
                              <option value="🛑">🛑</option>
                              <option value="🔄">🔄</option>
                              <option value="📌">📌</option>
                              <option value="📍">📍</option>
                            </select>
                          )}
                          {activeTab === 'funcionarios' && (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0 5px' }}>
                              {PRESET_COLORS.map(color => (
                                <div
                                  key={color}
                                  onClick={() => setEditColor(color)}
                                  style={{
                                    width: '20px', 
                                    height: '20px', 
                                    borderRadius: '50%', 
                                    backgroundColor: color,
                                    cursor: 'pointer', 
                                    border: editColor === color ? '2px solid white' : '2px solid transparent',
                                    boxShadow: editColor === color ? `0 0 0 1px ${color}` : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                  title={color}
                                />
                              ))}
                            </div>
                          )}
                          <input 
                            type="text" 
                            className="form-input" 
                            value={editValue} 
                            onChange={e => setEditValue(e.target.value)}
                            style={{ flex: 1, padding: '4px 12px', fontSize: '0.95rem', height: '36px', minWidth: 0 }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          {activeTab === 'medicos' && (
                            <input
                              type="text"
                              className="form-input"
                              placeholder="CRM..."
                              value={editCrm}
                              onChange={e => setEditCrm(e.target.value)}
                              style={{ width: '120px', padding: '4px 12px', height: '36px' }}
                            />
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', fontSize: '0.95rem' }}>
                            {activeTab === 'funcionarios' && (
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: item.color || '#3b82f6', marginRight: '10px' }}></div>
                            )}
                            {activeTab === 'status' && rawItemName.includes('|') ? (
                              <>
                                <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>{rawItemName.split('|')[0]}</span>
                                {itemName}
                              </>
                            ) : (
                              itemName
                            )}
                          </span>
                          {activeTab === 'medicos' && itemCrm && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>CRM: {itemCrm}</span>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {editingId === item.id ? (
                          <>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#10b981' }}
                              onClick={() => handleSaveEdit(item.id)}
                              title="Salvar"
                            >
                              <Save size={18} />
                            </button>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#6b7280' }}
                              onClick={() => setEditingId(null)}
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : deletingId === item.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '500' }}>Confirmar exclusão?</span>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              onClick={() => handleDelete(item.id)}
                              title="Sim, excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#6b7280', backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
                              onClick={() => setDeletingId(null)}
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#3b82f6' }}
                              onClick={() => handleEditClick(item)}
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              type="button" 
                              className="btn-icon" 
                              style={{ color: '#ef4444' }}
                              onClick={() => setDeletingId(item.id)}
                              title="Remover"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

