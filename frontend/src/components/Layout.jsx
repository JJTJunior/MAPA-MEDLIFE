import React, { useState } from 'react';
import { LayoutDashboard, Calendar, LogOut, Sun, Moon, Settings, Menu, X, Truck, Stethoscope } from 'lucide-react';

export default function Layout({ children, activeTab, setActiveTab, user, onLogout, theme, toggleTheme, onlineUsers, onOpenOnlineModal }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Gerente' || user?.role === 'Administrativo' || user?.role === 'Diretoria' || user?.role === 'TI';
  const hasSettingsPermission = user?.permissions?.allowed_edit_fields?.includes('view_settings') || isAdminOrManager;
  const hasDriverPermission = user?.role === 'Motorista' || user?.permissions?.allowed_edit_fields?.includes('view_driver');
  const hasScrubNursePermission = user?.role === 'Instrumentador' || user?.permissions?.allowed_edit_fields?.includes('view_scrub_nurse');
  
  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };
  
  const handleOnlineClick = () => {
    if (onOpenOnlineModal) onOpenOnlineModal();
    else handleNavClick('dashboard');
  };

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Mobile TopBar */}
      <div className="mobile-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '45px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span 
            style={{ 
              fontSize: '0.8rem', 
              color: '#10b981', 
              fontWeight: 'bold', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              cursor: 'pointer',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}
            onClick={handleOnlineClick}
            title="Clique para ver lista detalhada de usuários online"
          >
            👁️ {onlineUsers && onlineUsers.length > 0 ? onlineUsers.length : 1} online
          </span>
          <button className="btn-icon" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Overlay */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="logo-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '80px', objectFit: 'contain' }} />
          </div>

        </div>
        
        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'surgeries' ? 'active' : ''}`}
            onClick={() => handleNavClick('surgeries')}
          >
            <Calendar size={20} />
            Mapa Cirúrgico
          </button>
          
          {hasDriverPermission && (
            <button 
              className={`nav-item ${activeTab === 'driver' ? 'active' : ''}`}
              onClick={() => handleNavClick('driver')}
            >
              <Truck size={20} />
              Motorista
            </button>
          )}
          
          {hasScrubNursePermission && (
            <button 
              className={`nav-item ${activeTab === 'scrub_nurse' ? 'active' : ''}`}
              onClick={() => handleNavClick('scrub_nurse')}
            >
              <Stethoscope size={20} />
              Instrumentador
            </button>
          )}
          
          {hasSettingsPermission && (
            <button 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <Settings size={20} />
              Configurações
            </button>
          )}
        </nav>
        
        {user && (
          <div className="user-profile-widget">
            <div className="user-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span className="user-name">{user.name || user.email.split('@')[0].toUpperCase()}</span>
                <span 
                  style={{ 
                    fontSize: '0.75rem', 
                    color: '#10b981', 
                    fontWeight: 'bold', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    transition: 'transform 0.15s'
                  }}
                  onClick={handleOnlineClick}
                  title="Clique para abrir usuários online"
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  👁️ {onlineUsers && onlineUsers.length > 0 ? onlineUsers.length : 1} online
                </span>
              </div>
              <span className="user-role">{user.role || 'Usuário'}</span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button className="btn-logout" onClick={onLogout} style={{ flex: 1 }}>
                <LogOut size={16} />
                Sair
              </button>
              
              <button className="btn-icon" onClick={toggleTheme} title="Alternar Tema" style={{ padding: '8px 12px' }}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
          </div>
        )}
      </aside>
      
      {/* Main Content Pane */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
