import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';
import { Users, Plus, Shield, Check, X, ShieldAlert, Edit, UserX, UserCheck, Settings, KeyRound, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [fieldModalUser, setFieldModalUser] = useState(null);
  const [filterGroup, setFilterGroup] = useState('');
  
  const MAP_FIELDS = [
    { id: 'status', label: 'Status' },
    { id: 'date', label: 'Data' },
    { id: 'time', label: 'Hora' },
    { id: 'doctor', label: 'Médico / Buco' },
    { id: 'hospital', label: 'Hospital' },
    { id: 'patient', label: 'Paciente' },
    { id: 'health_insurance', label: 'Convênio' },
    { id: 'surgery_type', label: 'Tipo de Cirurgia' },
    { id: 'carater', label: 'Caráter' },
    { id: 'material', label: 'Material / Procedimento' },
    { id: 'surgery_code', label: 'Cód. Cirurgia' },
    { id: 'salesperson', label: 'Vendedor' },
    { id: 'instrumentalist1', label: 'Instrumentador 1' },
    { id: 'instrumentalist2', label: 'Instrumentador 2' },
    { id: 'opme', label: 'OPME' },
    { id: 'cme', label: 'CME' },
    { id: 'bloco', label: 'BLOCO' },
    { id: 'pos', label: 'PÓS' },
    { id: 'attachment_url', label: 'ANEXO 1 (Upload)' },
    { id: 'comanda_urls', label: 'ANEXO 2 (Upload)' },
    { id: 'observation', label: 'Observação' },
    { id: 'delete', label: 'Botão Excluir (Cirurgia)' },
    { id: 'manage_on_call', label: 'Gerenciar Pronto Aviso' },
    { id: 'create_surgery', label: 'Botão Agendar Cirurgia' },
    { id: 'import_surgery', label: 'Botões Importar Planilha e Modelo' },
    { id: 'edit_surgery_button', label: 'Botão Editar Agendamento' },
    { id: 'edit_attachments_1_button', label: 'Botão Editar Anexos 1' },
    { id: 'edit_attachments_2_button', label: 'Botão Editar Anexos 2' },
    { id: 'view_settings', label: 'Botão Configurações' },
    { id: 'cad_vendedores', label: 'Cadastro: Vendedores' },
    { id: 'cad_medicos', label: 'Cadastro: Médicos' },
    { id: 'cad_instrumentadores', label: 'Cadastro: Instrumentadores' },
    { id: 'cad_hospitais', label: 'Cadastro: Hospitais' },
    { id: 'cad_convenios', label: 'Cadastro: Convênios' },
    { id: 'cad_surgery_types', label: 'Cadastro: Tipos Cirurgia' },
    { id: 'cad_carater', label: 'Cadastro: Caráter' },
    { id: 'cad_status', label: 'Cadastro: Status' },
    { id: 'cad_funcionarios', label: 'Cadastro: Funcionários' },
    { id: 'cad_user_groups', label: 'Cadastro: Grupos (Acesso)' },
    { id: 'cad_usuarios', label: 'Cadastro: Usuários (Acesso)' },
    { id: 'cad_logs', label: 'Logs de Auditoria' }
  ];
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    group_name: '',
    can_edit: true,
    can_view_only: false,
    isDefaultPassword: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch groups
      const { data: groupsData, error: gError } = await supabase
        .from('user_groups')
        .select('*');
      if (!gError && groupsData) setGroups(groupsData);

      // 2. Fetch users (profiles)
      const { data: usersData, error: uError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          name,
          email,
          permissions,
          is_active,
          group_id,
          user_groups ( name )
        `)
        .order('name');
      if (!uError && usersData) setUsers(usersData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'isDefaultPassword') {
      setFormData(prev => ({
        ...prev,
        isDefaultPassword: checked,
        password: checked ? '123456' : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.group_name) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      const permissions = {
        can_edit: !formData.can_view_only && formData.can_edit,
        can_view_only: formData.can_view_only,
        require_password_change: formData.isDefaultPassword
      };

      // Create a compatible bcrypt hash manually in the browser!
      // This completely avoids the Supabase email rate limit AND prevents GoTrue crashes.
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(formData.password, salt);

      const { data, error } = await supabase.rpc('admin_create_user', {
        admin_email: currentUser.email,
        new_email: formData.email,
        new_password_hash: passwordHash,
        new_name: formData.name,
        group_name: formData.group_name,
        custom_permissions: permissions
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      alert('Usuário criado com sucesso!');
      setFormData({
        name: '', email: '', password: '', group_name: '', can_edit: true, can_view_only: false, isDefaultPassword: false
      });
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar usuário. Certifique-se que o usuário já não existe e que você é administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (u) => {
    setEditingUser({
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      original_email: u.email || '',
      group_id: u.group_id || ''
    });
  };

  const saveEdit = async () => {
    try {
      if (editingUser.email && editingUser.email !== editingUser.original_email) {
        // Email was changed! Let's call the RPC
        const { data: emailData, error: emailError } = await supabase.rpc('admin_update_user_email', {
          admin_email: currentUser.email,
          target_user_id: editingUser.id,
          new_email: editingUser.email
        });
        
        if (emailError) throw emailError;
        if (emailData && !emailData.success) throw new Error(emailData.error);
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ name: editingUser.name, group_id: editingUser.group_id })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      setEditingUser(null);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar edição: ' + e.message);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    if (!window.confirm(`Deseja realmente ${currentStatus ? 'inativar' : 'ativar'} este usuário?`)) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao alterar status do usuário.');
    }
  };

  const handleTogglePermission = async (userId, currentPerms, field) => {
    try {
      const newPerms = { ...currentPerms, [field]: !currentPerms[field] };
      const { error } = await supabase
        .from('user_profiles')
        .update({ permissions: newPerms })
        .eq('id', userId);
      
      if (error) throw error;
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao alterar permissão.');
    }
  };

  const handleSaveFieldPermissions = async (userId, newFields) => {
    try {
      const u = users.find(x => x.id === userId);
      const currentPerms = u.permissions || {};
      const newPerms = { ...currentPerms, allowed_edit_fields: newFields };
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ permissions: newPerms })
        .eq('id', userId);
      if (error) throw error;
      setFieldModalUser(null);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar campos permitidos.');
    }
  };

  const handleResetPassword = async (userToReset) => {
    if (!window.confirm(`Deseja realmente resetar a senha de ${userToReset.name} para a senha padrão (123456)?\n\nO usuário será forçado a alterar a senha no próximo acesso.`)) {
      return;
    }

    try {
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync('123456', salt);

      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        admin_email: currentUser.email,
        target_email: userToReset.email,
        new_password_hash: passwordHash
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      alert(`Senha de ${userToReset.name} resetada com sucesso para 123456!`);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Erro ao resetar senha: ' + e.message);
    }
  };

  const filteredUsers = filterGroup 
    ? users.filter(u => u.group_id === filterGroup) 
    : users;

  const exportToExcel = () => {
    const dataToExport = filteredUsers.map(u => ({
      Nome: u.name,
      'E-mail': u.email,
      Grupo: u.user_groups?.name || 'Sem Grupo',
      'Status': u.is_active !== false ? 'Ativo' : 'Inativo',
      'Apenas Visualizar': u.permissions?.can_view_only ? 'Sim' : 'Não'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    
    XLSX.writeFile(workbook, "usuarios_cadastrados.xlsx");
  };

  return (
    <div style={{ padding: '10px' }}>
      {/* Form de Criação */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', color: 'var(--text-primary)' }}>
          <Plus size={18} style={{ color: '#10b981' }}/> Novo Usuário
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nome Completo *</label>
            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleInputChange} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>E-mail *</label>
            <input type="email" name="email" className="form-input" value={formData.email} onChange={handleInputChange} required autoComplete="off" data-lpignore="true" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Senha *</label>
            <input type="password" name="password" className="form-input" value={formData.password} onChange={handleInputChange} required minLength={6} disabled={formData.isDefaultPassword} autoComplete="new-password" data-lpignore="true" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Grupo *</label>
            <select name="group_name" className="form-input" value={formData.group_name} onChange={handleInputChange} required>
              <option value="">Selecione um grupo</option>
              {groups.length > 0 ? (
                groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)
              ) : (
                <>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Diretoria">Diretoria</option>
                  <option value="Instrumentador">Instrumentador</option>
                  <option value="Vendedor">Vendedor</option>
                </>
              )}
            </select>
          </div>
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '20px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" name="can_view_only" checked={formData.can_view_only} onChange={handleInputChange} />
              Apenas Visualizar (Sem edição)
            </label>
            {!formData.can_view_only && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" name="can_edit" checked={formData.can_edit} onChange={handleInputChange} />
                Pode Editar
              </label>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" name="isDefaultPassword" checked={formData.isDefaultPassword} onChange={handleInputChange} />
              Senha Padrão (123456) com Troca Obrigatória
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Usuários */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
            <Users size={18} style={{ color: '#3b82f6' }}/> Usuários Cadastrados
          </h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              className="form-input" 
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
            >
              <option value="">Todos os Grupos</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button 
              className="btn-secondary" 
              onClick={exportToExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px' }}
              disabled={filteredUsers.length === 0}
              title="Exportar para Excel"
            >
              <Download size={16} />
              Exportar
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Nome</th>
                  <th style={{ padding: '10px' }}>E-mail</th>
                  <th style={{ padding: '10px' }}>Grupo</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Apenas Ver?</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const perms = u.permissions || { can_edit: true, can_view_only: false };
                  const isActive = u.is_active !== false; // default true se não tiver
                  const isEditing = editingUser && editingUser.id === u.id;
                  
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: isActive ? 1 : 0.5 }}>
                      <td style={{ padding: '10px' }}>
                        {isEditing ? (
                          <input type="text" className="form-input" style={{ padding: '4px' }}
                            value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
                        ) : (
                          <>
                            {u.name}
                            {!isActive && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#ef4444' }}>(Inativo)</span>}
                          </>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                        {isEditing ? (
                          <input type="email" className="form-input" style={{ padding: '4px', minWidth: '200px' }}
                            value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} />
                        ) : (
                          u.email
                        )}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {isEditing ? (
                          <select className="form-input" style={{ padding: '4px' }} 
                            value={editingUser.group_id} onChange={e => setEditingUser({...editingUser, group_id: e.target.value})}>
                            <option value="">Selecione...</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        ) : (
                          <span style={{ 
                            background: 'rgba(59,130,246,0.1)', 
                            color: '#60a5fa', 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            fontSize: '0.8rem' 
                          }}>
                            {u.user_groups?.name || 'Sem Grupo'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleTogglePermission(u.id, perms, 'can_view_only')}
                          style={{ color: perms.can_view_only ? '#10b981' : 'var(--text-muted)' }}
                          title="Alternar Permissão de Visualização"
                        >
                          {perms.can_view_only ? <Check size={18} /> : <X size={18} />}
                        </button>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            <button className="btn-icon" onClick={saveEdit} style={{ color: '#10b981' }} title="Salvar"><Check size={18}/></button>
                            <button className="btn-icon" onClick={() => setEditingUser(null)} style={{ color: '#ef4444' }} title="Cancelar"><X size={18}/></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button className="btn-icon" onClick={() => handleEditUser(u)} title="Editar"><Edit size={16}/></button>
                            <button 
                              className="btn-icon" 
                              onClick={() => handleToggleActive(u.id, isActive)}
                              style={{ color: isActive ? '#ef4444' : '#10b981' }}
                              title={isActive ? 'Inativar' : 'Ativar'}
                            >
                              {isActive ? <UserX size={16}/> : <UserCheck size={16}/>}
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => setFieldModalUser(u)}
                              title="Configurar Campos Permitidos"
                            >
                              <Settings size={16} />
                            </button>
                            <button
                              className="btn-icon"
                              onClick={() => handleResetPassword(u)}
                              title="Resetar para Senha Padrão (123456)"
                              style={{ color: '#f59e0b' }}
                            >
                              <KeyRound size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fieldModalUser && (
        <FieldPermissionsModal
          user={fieldModalUser}
          onClose={() => setFieldModalUser(null)}
          onSave={handleSaveFieldPermissions}
          mapFields={MAP_FIELDS}
        />
      )}
    </div>
  );
}

function FieldPermissionsModal({ user, onClose, onSave, mapFields }) {
  const currentPerms = user.permissions || {};
  const isViewOnly = currentPerms.can_view_only === true;
  
  const [selectedFields, setSelectedFields] = useState(
    isViewOnly ? [] : (currentPerms.allowed_edit_fields || mapFields.map(f => f.id))
  );

  const handleToggleField = (fieldId) => {
    if (isViewOnly) return;
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) return prev.filter(id => id !== fieldId);
      return [...prev, fieldId];
    });
  };

  const handleSelectAll = () => {
    if (isViewOnly) return;
    if (selectedFields.length === mapFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(mapFields.map(f => f.id));
    }
  };

  const groups = {
    "Informações Básicas": ['patient', 'doctor', 'hospital', 'health_insurance', 'date', 'time'],
    "Cirurgia": ['surgery_type', 'carater', 'material', 'surgery_code'],
    "Equipe": ['salesperson', 'instrumentalist1', 'instrumentalist2'],
    "Checklist e Status": ['status', 'opme', 'cme', 'bloco', 'pos'],
    "Adicionais (Mapa)": ['observation', 'attachment_url', 'comanda_urls', 'delete', 'manage_on_call', 'create_surgery', 'import_surgery', 'edit_surgery_button', 'edit_attachments_1_button', 'edit_attachments_2_button'],
    "Configurações (Cadastros Básicos)": [
      'view_settings',
      'cad_vendedores', 'cad_medicos', 'cad_instrumentadores', 'cad_hospitais', 'cad_convenios', 
      'cad_surgery_types', 'cad_carater', 'cad_status', 'cad_funcionarios', 
      'cad_user_groups', 'cad_usuarios', 'cad_logs'
    ]
  };


  return createPortal(
    <div className="modal-overlay" style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-primary)' }}>
          <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
            Permissões de Edição - {user.name}
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'var(--bg-secondary)' }}>
          
          {/* Alerta de Dica */}
          <div style={{ background: 'var(--status-urgent-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--status-urgent-border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <ShieldAlert size={20} style={{ color: 'var(--status-urgent-text)', flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.5' }}>
              Selecione quais campos este usuário pode editar no Mapa Cirúrgico. Se a opção <strong>"Apenas Visualizar"</strong> estiver ativada nas permissões gerais, o usuário não poderá editar nada, mesmo que os campos abaixo estejam marcados.
            </p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={handleSelectAll} 
              className="btn-secondary"
              disabled={isViewOnly}
              style={{ fontSize: '0.85rem', padding: '6px 12px', opacity: isViewOnly ? 0.5 : 1, cursor: isViewOnly ? 'not-allowed' : 'pointer' }}
            >
              {selectedFields.length === mapFields.length ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(groups).map(([groupName, fieldIds]) => {
              const groupFields = mapFields.filter(f => fieldIds.includes(f.id));
              if (groupFields.length === 0) return null;
              
              return (
                <div key={groupName} style={{ padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-primary)' }}>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '16px', marginTop: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '4px', height: '16px', background: 'var(--accent-blue)', borderRadius: '2px' }}></div>
                    {groupName}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                    {groupFields.map(field => {
                      const isChecked = selectedFields.includes(field.id);
                      return (
                        <label 
                          key={field.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px', 
                            cursor: isViewOnly ? 'not-allowed' : 'pointer', 
                            fontSize: '0.9rem', 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            background: isChecked ? 'var(--status-urgent-bg)' : 'transparent', 
                            border: '1px solid', 
                            borderColor: isChecked ? 'var(--status-urgent-border)' : 'var(--border-glass)', 
                            transition: 'all 0.2s',
                            userSelect: 'none',
                            color: isChecked ? 'var(--status-urgent-text)' : 'var(--text-secondary)',
                            opacity: isViewOnly ? 0.5 : 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleField(field.id)}
                            disabled={isViewOnly}
                            style={{ 
                              accentColor: 'var(--status-urgent-text)', 
                              width: '18px', 
                              height: '18px', 
                              margin: 0,
                              cursor: isViewOnly ? 'not-allowed' : 'pointer'
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? '600' : '400' }}>
                            {field.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={() => onSave(user.id, selectedFields)}>Salvar Permissões</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
