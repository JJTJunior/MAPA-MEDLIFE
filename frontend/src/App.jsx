import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import SurgeryGrid from './components/SurgeryGrid';
import SurgeryModal from './components/SurgeryModal';
import SurgeryDetails from './components/SurgeryDetails';
import SettingsPage from './components/SettingsPage';
import TVPanel from './components/TVPanel';
import OnlineUsersModal from './components/OnlineUsersModal';
import { Clock, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gridFilters, setGridFilters] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Theme Control
  const [theme, setTheme] = useState(() => localStorage.getItem('medlife-theme') || 'light');
  
  // Modal Control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [selectedSurgery, setSelectedSurgery] = useState(null);

  const [isRecovery, setIsRecovery] = useState(false);
  const [isForcedPasswordChange, setIsForcedPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // 1. Obter sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      resolveUser(session);
    });

    // 2. Ouvir mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      resolveUser(session);
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      return;
    }

    const getPageName = (tab) => {
      switch (tab) {
        case 'dashboard': return 'Dashboard';
        case 'surgeries': return 'Mapa Cirúrgico';
        case 'settings': return 'Configurações';
        case 'surgery_details': return 'Detalhes Cirurgia';
        case 'tv_panel': return 'Painel TV';
        default: return 'Sistema';
      }
    };

    const channel = supabase.channel('medlife-online-presence-room', {
      config: {
        presence: {
          key: user.id
        }
      }
    });

    const syncPresenceState = () => {
      const state = channel.presenceState();
      const list = [];
      Object.keys(state).forEach(key => {
        const presences = state[key];
        if (presences && presences.length > 0) {
          const latest = presences[presences.length - 1];
          list.push(latest);
        }
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
      setOnlineUsers(list);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresenceState)
      .on('presence', { event: 'join' }, syncPresenceState)
      .on('presence', { event: 'leave' }, syncPresenceState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          await channel.track({
            user_id: user.id,
            name: user.name || user.email.split('@')[0].toUpperCase(),
            email: user.email,
            role: user.role || 'Usuário',
            pageName: getPageName(activeTab),
            device: /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
            onlineAt: timeNow
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme); // Just in case
    localStorage.setItem('medlife-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const resolveUser = async (session) => {
    if (session?.user) {
      const email = session.user.email || '';
      let role = 'Vendedor';
      let name = email.split('@')[0].toUpperCase();
      let permissions = { can_edit: true, can_view_only: false };

      let profile = null;
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            name,
            permissions,
            user_groups ( name )
          `)
          .eq('id', session.user.id)
          .single();
          
        profile = data;
        
        if (profile) {
          name = profile.name || name;
          role = profile.user_groups?.name || role;
          permissions = profile.permissions || permissions;
        }
      } catch (e) {
        // Ignora erro caso a tabela não exista ainda e usa heurística
      }

      if (!profile || !profile.user_groups?.name) {
        if (email.includes('ti@')) {
          role = 'TI';
        } else if (email.includes('rh@') || email.includes('admin') || email.includes('diogo@')) {
          role = 'Admin';
        } else if (email.includes('gerente') || email.includes('natalia') || email.includes('valdemar')) {
          role = 'Gerente';
        }
      }

      if (permissions?.require_password_change) {
        setIsForcedPasswordChange(true);
      } else {
        setIsForcedPasswordChange(false);
      }

      setUser({
        id: session.user.id,
        email: email,
        name: name,
        role: role,
        permissions: permissions
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsRecovery(false);
    setIsForcedPasswordChange(false);
    setLoading(false);
    setIsLoggingOut(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setRecoveryError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setUpdatingPassword(true);
    setRecoveryError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;
      
      alert('Senha atualizada com sucesso!');
      setIsRecovery(false);
      setNewPassword('');
    } catch (error) {
      console.error('Erro de update password:', error);
      let errorStr = 'Erro ao atualizar a senha.';
      try {
        if (error) {
          if (typeof error === 'string') errorStr = error;
          else if (typeof error.message === 'string') errorStr = error.message;
          else if (typeof error.error_description === 'string') errorStr = error.error_description;
          else errorStr = JSON.stringify(error);
        }
      } catch (e) {}
      
      const lowerError = String(errorStr).toLowerCase();
      if (lowerError === '{}' || lowerError.includes('different from the old') || lowerError.includes('same as the old')) {
        errorStr = 'A nova senha não pode ser igual à atual. Escolha outra.';
      } else if (lowerError.includes('weak_password') || lowerError.includes('should be at least')) {
        errorStr = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (lowerError.includes('timeout') || lowerError.includes('fetch')) {
        errorStr = 'Erro de conexão. Verifique sua internet e tente novamente.';
      }
      
      setRecoveryError(errorStr);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleForcedPasswordUpdate = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setRecoveryError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setUpdatingPassword(true);
    setRecoveryError(null);

    try {
      // Usa o RPC customizado que executa instantaneamente no banco de dados
      // Isso evita o timeout de 30s do Supabase Auth e garante que a senha e a flag sejam alteradas juntas.
      const { data, error } = await supabase.rpc('user_update_password', { new_password: newPassword });

      if (error) {
        throw error;
      }
      
      // Alerta o usuário e desloga imediatamente para que ele logue com a senha nova
      alert('Senha alterada com sucesso! Você será redirecionado para a tela inicial. Por favor, faça login com sua nova senha.');
      handleLogout();

    } catch (error) {
      console.error('Erro de forced update password:', error);
      let errorStr = 'Erro ao atualizar a senha. Tente novamente.';
      try {
        if (error) {
          if (typeof error === 'string') errorStr = error;
          else if (typeof error.message === 'string') errorStr = error.message;
          else if (typeof error.error_description === 'string') errorStr = error.error_description;
          else errorStr = JSON.stringify(error);
        }
      } catch (e) {}
      
      const lowerError = String(errorStr).toLowerCase();
      if (lowerError.includes('weak_password') || lowerError.includes('should be at least') || lowerError.includes('characters')) {
        errorStr = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (lowerError.includes('timeout') || lowerError.includes('fetch')) {
        errorStr = 'A conexão falhou. Verifique sua internet e tente novamente.';
      } else if (lowerError.includes('different from the old') || lowerError.includes('same as the old')) {
        // Se bater no erro de senha igual
        errorStr = 'A nova senha não pode ser igual à atual. Se você já alterou, tente voltar ao login.';
      }

      setRecoveryError(errorStr);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleEditClick = (surgery) => {
    setSelectedSurgery(surgery);
    setIsModalOpen(true);
  };

  const handleViewSurgery = (surgery) => {
    setSelectedSurgery(surgery);
    setActiveTab('surgery_details');
  };

  const handleCreateClick = () => {
    setSelectedSurgery(null);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = (updatedData) => {
    if (updatedData && selectedSurgery && updatedData.id === selectedSurgery.id) {
      setSelectedSurgery(updatedData);
    }
    const current = activeTab;
    setActiveTab('');
    setTimeout(() => setActiveTab(current), 50);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <div className="empty-state">
          <Clock className="animate-spin" size={48} style={{ color: 'var(--accent-blue, #3b82f6)', marginBottom: '20px' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>
            {isLoggingOut ? 'Saindo da Aplicação...' : 'Inicializando Medlife...'}
          </h3>
        </div>
      </div>
    );
  }

  if (isRecovery) {
    return (
      <div className="login-container">
        <div className="login-box glass-panel">
          <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '15px' }} />
            <p>Redefinir Senha</p>
          </div>

          {recoveryError && (
            <div className="alert-error">
              <AlertCircle size={20} />
              <span>{recoveryError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">Digite sua nova senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: '35px', paddingRight: '40px' }}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={updatingPassword} style={{ marginTop: '10px' }}>
              {updatingPassword ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isForcedPasswordChange) {
    return (
      <div className="login-container">
        <div className="login-box glass-panel">
          <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '15px' }} />
            <p style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>Troca de Senha Obrigatória</p>
            <p style={{ fontSize: '0.85rem', marginTop: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>Como este é seu primeiro acesso, você precisa definir uma nova senha segura para continuar.</p>
          </div>

          {recoveryError && (
            <div className="alert-error">
              <AlertCircle size={20} />
              <span>{recoveryError}</span>
            </div>
          )}

          <div 
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleForcedPasswordUpdate(e);
            }}
          >
            {/* Campos ocultos para evitar preenchimento automático */}
            <input type="email" name="honey_email" style={{ display: 'none' }} tabIndex="-1" />
            <input type="password" name="honey_password" style={{ display: 'none' }} tabIndex="-1" />

            <div className="form-group">
              <label className="form-label" htmlFor="new-password">Digite sua nova senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  id="new-password"
                  name={Math.random().toString(36).substring(7)}
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: '35px', paddingRight: '40px' }}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={handleForcedPasswordUpdate} 
                className="btn-primary" 
                disabled={updatingPassword}
              >
                {updatingPassword ? 'Atualizando...' : 'Atualizar e Sair'}
              </button>
              
              <button 
                type="button" 
                onClick={handleLogout} 
                className="btn-secondary" 
                disabled={updatingPassword}
                style={{
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border-color, #e5e7eb)',
                  background: 'transparent',
                  color: 'var(--text-secondary, #4b5563)',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  width: '100%'
                }}
              >
                Cancelar e Voltar para Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tv') === 'true') {
    return <TVPanel user={null} onBack={() => window.location.href = '/'} />;
  }

  if (!session || !user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  if (activeTab === 'tv_panel') {
    return <TVPanel user={user} onBack={() => setActiveTab('dashboard')} />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={(tab) => {
        if (tab === 'surgeries') setGridFilters(null);
        setActiveTab(tab);
      }} 
      user={user} 
      onLogout={handleLogout}
      theme={theme}
      toggleTheme={toggleTheme}
      onlineUsers={onlineUsers}
      onOpenOnlineModal={() => setIsOnlineModalOpen(true)}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          user={user} 
          onlineUsers={onlineUsers}
          onOpenOnlineModal={() => setIsOnlineModalOpen(true)}
          onNavigate={(filters) => {
            setGridFilters(filters);
            setActiveTab('surgeries');
          }}
        />
      )}
      {activeTab === 'surgeries' && (
        <SurgeryGrid 
          user={user} 
          initialFilters={gridFilters}
          onEditClick={handleEditClick}
          onViewClick={handleViewSurgery}
          onCreateClick={handleCreateClick} 
          onBack={() => setActiveTab('dashboard')}
          onOpenTV={() => setActiveTab('tv_panel')}
        />
      )}
      
      {activeTab === 'surgery_details' && (
        <SurgeryDetails 
          surgery={selectedSurgery} 
          onBack={() => setActiveTab('surgeries')} 
          onEdit={() => setIsModalOpen(true)}
          onUpdate={setSelectedSurgery}
          user={user} 
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage 
          user={user} 
          onBack={() => setActiveTab('dashboard')}
        />
      )}

      {/* Modal único de Criar/Editar */}
      <SurgeryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        surgery={selectedSurgery}
        user={user}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Modal de Usuários Online */}
      <OnlineUsersModal 
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onlineUsers={onlineUsers}
        currentUser={user}
      />
    </Layout>
  );
}
