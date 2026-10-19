import React, { useState } from 'react';
import { api } from '../../lib/api';
import { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (tab === 'login') {
        const res = await api.login(username, password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.register(username, email, password);
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCreds = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0a0d0c',
          border: '1px solid #2a312d',
          borderRadius: '8px',
          padding: '28px',
          maxWidth: '420px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              {tab === 'login' ? 'Analytical Workspace Login' : 'Create Intelligence Account'}
            </h3>
            <p style={{ fontSize: '12px', color: '#8e9693', marginTop: '2px' }}>
              Role-based access control &amp; session security
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8e9693', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#070908', border: '1px solid #1f2421', borderRadius: '6px', padding: '3px' }}>
          <button
            type="button"
            onClick={() => { setTab('login'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: tab === 'login' ? '#fff' : 'transparent',
              color: tab === 'login' ? '#000' : '#8e9693',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: '6px',
              fontSize: '12px',
              fontWeight: 600,
              background: tab === 'register' ? '#fff' : 'transparent',
              color: tab === 'register' ? '#000' : '#8e9693',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Register
          </button>
        </div>

        {/* Demo Quick Logins */}
        {tab === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10.5px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Demo Fill:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fillDemoCreds('admin', 'admin123')}
                style={{
                  flex: 1,
                  background: '#0e1210',
                  border: '1px solid #1f2421',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Admin (admin / admin123)
              </button>
              <button
                type="button"
                onClick={() => fillDemoCreds('analyst', 'analyst123')}
                style={{
                  flex: 1,
                  background: '#0e1210',
                  border: '1px solid #1f2421',
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Analyst (analyst / analyst123)
              </button>
            </div>
          </div>
        )}

        {/* Error alert */}
        {errorMsg && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: '#f87171', fontSize: '12px' }}>
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8e9693', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or analyst"
              style={{
                width: '100%',
                background: '#070908',
                border: '1px solid #1f2421',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {tab === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#8e9693', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: '100%',
                  background: '#070908',
                  border: '1px solid #1f2421',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#8e9693', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                background: '#070908',
                border: '1px solid #1f2421',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: '6px',
            }}
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In to Workspace' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
