const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/SettingsPage.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Change component name and signature
content = content.replace(
  'export default function SettingsModal({ isOpen, onClose, user }) {',
  'export default function SettingsPage({ user }) {'
);

// Remove isOpen checks
content = content.replace(/if \(!isOpen\) return null;/g, '');

const returnStart = content.indexOf('  return (');
const returnContent = `  return (
    <div className="settings-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={28} style={{ color: '#3b82f6' }} />
          Configurações do Sistema
        </h2>
        <p className="dashboard-subtitle">Gerencie os parâmetros, acessos e configurações do Medlife</p>
      </div>

      <div className="settings-layout">
        {/* Sidebar Menu */}
        <div className="settings-sidebar glass-card">
          <div className="settings-menu">
            {[
              { id: 'vendedores', icon: <Users size={18} />, label: 'Vendedores' },
              { id: 'medicos', icon: <Stethoscope size={18} />, label: 'Médicos' },
              { id: 'instrumentadores', icon: <UserPlus size={18} />, label: 'Instrumentadores' },
              { id: 'hospitais', icon: <Building2 size={18} />, label: 'Hospitais' },
              { id: 'convenios', icon: <FileText size={18} />, label: 'Convênios' },
              { id: 'surgery_types', icon: <Activity size={18} />, label: 'Tipos Cirurgia' },
              { id: 'procedimentos', icon: <Stethoscope size={18} />, label: 'Procedimentos' },
              { id: 'codigos_cirurgia', icon: <Hash size={18} />, label: 'Códigos' },
              { id: 'status', icon: <Tag size={18} />, label: 'Status' },
              { id: 'funcionarios', icon: <Users size={18} />, label: 'Funcionários' },
              { id: 'user_groups', icon: <ShieldAlert size={18} />, label: 'Grupos (Acesso)' },
              { id: 'usuarios', icon: <ShieldAlert size={18} />, label: 'Usuários (Acesso)' },
              { id: 'logs', icon: <List size={18} />, label: 'Logs de Auditoria' }
            ].map(tab => (
              <button 
                key={tab.id}
                type="button"
                className={\`settings-menu-btn \${activeTab === tab.id ? 'active' : ''}\`}
                onClick={() => setActiveTab(tab.id)}
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
            <div style={{ marginBottom: '25px' }}>
              <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px' }}>
                {activeTab === 'status' && (
                  <select
                    className="form-input"
                    value={selectedIcon}
                    onChange={e => setSelectedIcon(e.target.value)}
                    style={{ width: '80px', padding: '0 10px', fontSize: '1.2rem' }}
                  >
                    <option value="⚪">⚪</option>
                    <option value="🟢">🟢</option>
                    <option value="🟡">🟡</option>
                    <option value="🟠">🟠</option>
                    <option value="🔴">🔴</option>
                    <option value="🔵">🔵</option>
                    <option value="🟣">🟣</option>
                    <option value="⚫">⚫</option>
                    <option value="🟤">🟤</option>
                  </select>
                )}
                {activeTab === 'funcionarios' && (
                  <input 
                    type="color" 
                    value={selectedColor} 
                    onChange={e => setSelectedColor(e.target.value)} 
                    className="form-input" 
                    style={{ width: '50px', padding: '2px', cursor: 'pointer', height: 'auto' }} 
                    title="Escolher Cor" 
                  />
                )}
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={\`Novo nome de \${activeTab === 'status' ? 'status' : activeTab === 'surgery_types' ? 'tipo de cirurgia' : activeTab.slice(0, -1)}...\`}
                  value={newItemName} 
                  onChange={e => setNewItemName(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '5px' }}
                  disabled={isSubmitting}
                >
                  <Plus size={18} />
                  Adicionar
                </button>
              </form>
            </div>
          )}

          {activeTab === 'usuarios' ? (
            <UserManagement currentUser={user} />
          ) : activeTab === 'logs' ? (
            <AuditLogs />
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', textTransform: 'capitalize', margin: 0, fontWeight: '600' }}>
                  Lista de {activeTab === 'surgery_types' ? 'Tipos de Cirurgia' : activeTab}
                </h3>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '250px', padding: '8px 12px 8px 32px', fontSize: '0.9rem' }}
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
                  filteredItems.map((item, index) => (
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
                              style={{ width: '60px', padding: '0 5px', fontSize: '1rem', height: '36px' }}
                            >
                              <option value="⚪">⚪</option>
                              <option value="🟢">🟢</option>
                              <option value="🟡">🟡</option>
                              <option value="🟠">🟠</option>
                              <option value="🔴">🔴</option>
                              <option value="🔵">🔵</option>
                              <option value="🟣">🟣</option>
                              <option value="⚫">⚫</option>
                              <option value="🟤">🟤</option>
                            </select>
                          )}
                          {activeTab === 'funcionarios' && (
                            <input 
                              type="color" 
                              value={editColor} 
                              onChange={e => setEditColor(e.target.value)} 
                              className="form-input" 
                              style={{ width: '50px', padding: '2px', cursor: 'pointer', height: '36px' }} 
                            />
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
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', fontSize: '0.95rem' }}>
                            {activeTab === 'funcionarios' && (
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: item.color || '#3b82f6', marginRight: '10px' }}></div>
                            )}
                            {activeTab === 'status' && item.name.includes('|') ? (
                              <>
                                <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>{item.name.split('|')[0]}</span>
                                {item.name.split('|')[1]}
                              </>
                            ) : (
                              item.name
                            )}
                          </span>
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
                              onClick={() => handleDelete(item.id)}
                              title="Remover"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;

content = content.substring(0, returnStart) + returnContent + '\n}\n';

// Remove the isOpen from useEffect dependency array
content = content.replace(/\[isOpen, activeTab\]/, '[activeTab]');
// Remove fetchItems from if (isOpen)
content = content.replace(/if \(isOpen\) {\n\s*fetchItems\(\);\n\s*setSearchTerm\(''\);\n\s*}/g, 'fetchItems();\n    setSearchTerm(\'\');');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('SettingsPage.jsx updated successfully.');
