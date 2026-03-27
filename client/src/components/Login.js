import React, { useState } from 'react';
import { authService } from '../services/api';
import './Auth.css';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await authService.login(email, password);
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

          <button
            type="submit"
            className="btn btn-primary auth-btn"
            disabled={isLoading}
          >
            {isLoading ? '⏳ Accesso in corso...' : '✨ Accedi'}
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
