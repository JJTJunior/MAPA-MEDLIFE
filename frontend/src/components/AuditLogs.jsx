import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Activity, Clock, Search, Filter } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          target_table,
          record_id,
          old_data,
          new_data,
          created_at,
          user_profiles!audit_logs_user_id_fkey ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error(e);
      // alert('Erro ao buscar logs. Verifique se as funções SQL foram aplicadas no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const userName = log.user_profiles?.name || 'Sistema';
    const searchLower = searchTerm.toLowerCase();
    return (
      userName.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.target_table.toLowerCase().includes(searchLower)
    );
  });

  const getActionColor = (action) => {
    switch (action.toUpperCase()) {
      case 'INSERT': return '#10b981';
      case 'UPDATE': return '#f59e0b';
      case 'DELETE': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getActionName = (action) => {
    switch (action.toUpperCase()) {
      case 'INSERT': return 'Inserção';
      case 'UPDATE': return 'Edição';
      case 'DELETE': return 'Exclusão';
      default: return action;
    }
  };

  const formatData = (data, tableName) => {
    if (!data) return '-';
    try {
      const copy = { ...data };
      if (tableName === 'surgeries') {
        return `Paciente: ${copy.patient || '?'} | Status: ${copy.status || '?'}`;
      } else if (copy.name) {
        let details = copy.name;
        if (copy.email) details += ` (${copy.email})`;
        if (tableName === 'funcionarios' && copy.color) {
          details += ` [Cor: ${copy.color}]`;
        }
        return details;
      }
      return JSON.stringify(copy).substring(0, 80) + '...';
    } catch {
      return '-';
    }
  };

  const getTableName = (table) => {
    const names = {
      'surgeries': 'Cirurgias',
      'vendedores': 'Vendedores',
      'medicos': 'Médicos',
      'instrumentadores': 'Instrumentadores',
      'hospitais': 'Hospitais',
      'convenios': 'Convênios',
      'surgery_types': 'Tipos de Cirurgia',
      'procedimentos': 'Procedimentos',
      'status': 'Status',
      'funcionarios': 'Funcionários',
      'user_profiles': 'Usuários (Perfis)',
      'user_groups': 'Grupos de Usuários'
    };
    return names[table] || table;
  };

  return (
    <div style={{ padding: '10px' }}>
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
            <Activity size={20} style={{ color: '#8b5cf6' }} /> Logs de Acesso e Auditoria
          </h3>
          
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar por usuário, ação..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Clock className="animate-spin" size={24} style={{ display: 'inline', marginBottom: '10px', color: '#8b5cf6' }} /><br />
            Carregando histórico...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Nenhum registro de log encontrado. 
          </div>
        ) : (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 10px' }}>Data e Hora</th>
                  <th style={{ padding: '12px 10px' }}>Usuário</th>
                  <th style={{ padding: '12px 10px' }}>Ação</th>
                  <th style={{ padding: '12px 10px' }}>Tabela (Alvo)</th>
                  <th style={{ padding: '12px 10px' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => {
                  const date = new Date(log.created_at);
                  const userName = log.user_profiles?.name || 'Sistema';
                  
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', verticalAlign: 'top' }}>
                      <td style={{ padding: '12px 10px', whiteSpace: 'nowrap' }}>
                        {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: '500' }}>{userName}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          backgroundColor: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action),
                          fontWeight: '600',
                          fontSize: '0.75rem'
                        }}>
                          {getActionName(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{getTableName(log.target_table)}</td>
                      <td style={{ padding: '12px 10px' }}>
                        {log.action === 'INSERT' && (
                          <div><span style={{ color: '#10b981' }}>Adicionado:</span> {formatData(log.new_data, log.target_table)}</div>
                        )}
                        {log.action === 'DELETE' && (
                          <div><span style={{ color: '#ef4444' }}>Excluído:</span> {formatData(log.old_data, log.target_table)}</div>
                        )}
                        {log.action === 'UPDATE' && (
                          <div>
                            <span style={{ color: '#f59e0b' }}>Atualizado:</span> {formatData(log.new_data, log.target_table)}
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
    </div>
  );
}
