import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Novos estados
  const [view, setView] = useState('login'); // 'login' ou 'forgot'
  const [rememberMe, setRememberMe] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('medlife_saved_email');
    const savedPassword = localStorage.getItem('medlife_saved_password');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fullEmail = email.includes('@') ? email : `${email}@medlifebrasil.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        // Verificar se o usuário está ativo
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (profileData && profileData.is_active === false) {
          await supabase.auth.signOut();
          throw new Error('Usuário inativo. Acesso negado.');
        }

        // Obter o cargo do usuário (pode ser inferido do email ou dos metadados)
        const userEmail = data.user.email || '';
        let role = 'Vendedor'; // padrão
        
        if (userEmail.includes('ti@') || userEmail.includes('admin') || userEmail.includes('diogo@')) {
          role = 'Admin';
        } else if (userEmail.includes('gerente') || userEmail.includes('natalia') || userEmail.includes('valdemar')) {
          role = 'Gerente';
        }

        // Salvar ou remover credenciais
        if (rememberMe) {
          localStorage.setItem('medlife_saved_email', email);
          localStorage.setItem('medlife_saved_password', password);
        } else {
          localStorage.removeItem('medlife_saved_email');
          localStorage.removeItem('medlife_saved_password');
        }

        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSuccess(false);

    const fullEmail = email.includes('@') ? email : `${email}@medlifebrasil.com`;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(fullEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'forgot') {
    return (
      <div className="login-container">
        <div className="login-box glass-panel">
          <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '15px' }} />
            <p>Recuperação de Senha</p>
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          
          {resetSuccess && (
            <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
              <CheckCircle size={20} />
              <span>E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.</span>
            </div>
          )}

          {!resetSuccess ? (
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">Usuário Cadastrado</label>
                <input
                  id="reset-email"
                  type="text"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu usuário (ex: joao.silva)"
                  required
                />
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', marginLeft: '4px' }}>
                  @medlifebrasil.com
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginBottom: '15px' }}>
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </button>
            </form>
          ) : (
             <div style={{ marginBottom: '15px' }} />
          )}

          <div style={{ textAlign: 'center' }}>
            <button 
              type="button" 
              onClick={() => { setView('login'); setError(null); setResetSuccess(false); }}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}
            >
              <ArrowLeft size={16} /> Voltar para o Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box glass-panel">
        <div className="login-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="Medlife Brasil" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '15px' }} />
          <p>Mapa Cirúrgico & Controle de Entregas</p>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Usuário</label>
            <input
              id="email"
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu usuário (ex: joao.silva)"
              required
            />
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', marginLeft: '4px' }}>
              @medlifebrasil.com
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                style={{ paddingRight: '40px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '20px', fontSize: '0.9rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#4b5563' }}>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              Lembrar-me
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="helper-text" style={{ textAlign: 'center' }}>
          <p className="login-footer-text" style={{ color: '#6b7280', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <span>&copy; 2026 Medlife Brasil</span>
            <span className="footer-dash"> &mdash; </span>
            <span className="footer-rights">Todos os direitos reservados</span>
          </p>
        </div>
      </div>
    </div>
  );
}
