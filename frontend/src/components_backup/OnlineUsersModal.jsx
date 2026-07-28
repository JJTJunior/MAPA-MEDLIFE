import React from 'react';
import { createPortal } from 'react-dom';
import { X, Eye } from 'lucide-react';

export default function OnlineUsersModal({ isOpen, onClose, onlineUsers, currentUser }) {
  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)', 
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '750px', 
          width: '100%', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden', 
          borderRadius: '16px',
          background: 'var(--bg-primary, #ffffff)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-color, #e2e8f0)', 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center',
          background: 'var(--bg-secondary, #f8fafc)' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              padding: '10px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Eye size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold', color: 'var(--text-primary, #0f172a)' }}>
                Usuários Online
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                Usuários ativos em tempo real na plataforma Medlife
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              color: '#059669', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
              {onlineUsers ? onlineUsers.length : 1} online
            </span>
            <button 
              className="btn-icon" 
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', color: 'var(--text-secondary)' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body Table */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px', width: '45px', textAlign: 'center' }}>-</th>
                <th style={{ padding: '12px 8px' }}>Usuário</th>
                <th style={{ padding: '12px 8px' }}>Tipo</th>
                <th style={{ padding: '12px 8px' }}>Página</th>
                <th style={{ padding: '12px 8px' }}>Última Ação</th>
                <th style={{ padding: '12px 8px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(!onlineUsers || onlineUsers.length === 0) ? (
                <tr>
                  <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Nenhum outro usuário online no momento.
                  </td>
                </tr>
              ) : (
                onlineUsers.map((u, idx) => {
                  const isMe = currentUser?.id === u.user_id;
                  const roleName = u.role || 'Usuário';
                  const isRedRole = roleName === 'Admin' || roleName === 'Administrativo' || roleName === 'Administrador' || roleName === 'TI';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: '1.2rem' }}>
                        {u.device === 'Mobile' ? '📱' : '💻'}
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {u.name} {isMe && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'normal', marginLeft: '6px' }}>(Você)</span>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          backgroundColor: isRedRole ? '#ef4444' : roleName === 'Gerente' ? '#8b5cf6' : roleName === 'Vendedor' ? '#3b82f6' : '#10b981', 
                          color: '#ffffff', 
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold',
                          display: 'inline-block'
                        }}>
                          {roleName}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        {u.pageName || 'Dashboard'}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                        🕒 {u.onlineAt || '-'}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span> Online
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-color, #e2e8f0)', 
          display: 'flex', 
          justify: 'flex-end',
          background: 'var(--bg-secondary, #f8fafc)' 
        }}>
          <button 
            type="button"
            className="btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: '8px', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
