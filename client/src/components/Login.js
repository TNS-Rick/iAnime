import React, { useState } from 'react';
import { authService } from '../services/api';
import './Auth.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [requiresTwoFA, setRequiresTwoFA] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState('app');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.login(email, password, requiresTwoFA ? twoFACode : '');

      if (data.requiresTwoFA) {
        setRequiresTwoFA(true);
        setTwoFAMethod(data.method || 'app');
        setError('Inserisci il codice 2FA del tuo autenticatore per completare l\'accesso');
        return;
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Errore di login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>⚡ iAnime</h1>
          <p>Accedi per continuare</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">📧 Email</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="tuo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">🔐 Password</label>
            <div className="password-input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {requiresTwoFA && (
            <div className="form-group">
              <label htmlFor="twoFACode">🔢 Codice 2FA</label>
              <input
                type="text"
                id="twoFACode"
                className="form-control"
                placeholder={twoFAMethod === 'app' ? '123456' : 'Codice di verifica'}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required={requiresTwoFA}
                disabled={isLoading}
              />
              <small className="text-muted">Apri la tua app autenticatore e inserisci il codice generato.</small>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Accesso in corso...' : requiresTwoFA ? '🔐 Verifica 2FA' : '✨ Accedi'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Non hai un account?{' '}
            <a href="#" onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('showRegister'));
            }}>
              Registrati qui
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
